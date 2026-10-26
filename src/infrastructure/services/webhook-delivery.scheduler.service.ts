import { createHmac } from 'node:crypto';
import { colors } from '@gamastudio/colorslog';
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { IEmailsRepository, IWebhookDeliveriesRepository, IWebhookEndpointsRepository } from 'src/core/application/contracts/persistence';
import type { IHttpDeliveryService } from 'src/core/application/contracts/services/http-delivery.service';
import type { Email } from 'src/core/domain/entities/email.entity';
import type { WebhookDelivery } from 'src/core/domain/entities/webhook-delivery.entity';
import type { WebhookEndpoint } from 'src/core/domain/entities/webhook-endpoint.entity';

export const WEBHOOK_SCHEDULER_INTERVAL_MS = 30_000;
const RETRY_INTERVAL_SECONDS = 60;
const MAX_DELIVERY_ATTEMPTS = 3;

/**
 * Ships the queued delivery-status webhooks: every due `webhook_deliveries`
 * row is POSTed signed and classified. Retries wait `60s * attempt`, and the
 * delivery is given up after `MAX_DELIVERY_ATTEMPTS` (ok=false).
 */
@Injectable()
export class WebhookDeliveryScheduler implements OnModuleInit, OnModuleDestroy {
    #intervalHandle: ReturnType<typeof setInterval> | null = null;
    #running = false;

    constructor(
        private readonly _deliveriesRepository: IWebhookDeliveriesRepository,
        private readonly _endpointsRepository: IWebhookEndpointsRepository,
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _httpDeliveryService: IHttpDeliveryService,
    ) { }

    public onModuleInit(): void {
        this.#intervalHandle = setInterval(() => { void this.tick(); }, WEBHOOK_SCHEDULER_INTERVAL_MS);
    }

    public onModuleDestroy(): void {
        if (this.#intervalHandle !== null) {
            clearInterval(this.#intervalHandle);
            this.#intervalHandle = null;
        }
    }

    public isRunning(): boolean {
        return this.#intervalHandle !== null;
    }

    /** Bounded and idempotent: overlapping ticks are skipped. */
    public tick = async (): Promise<void> => {
        if (this.#running) return;
        this.#running = true;
        try {
            const due = await this._deliveriesRepository.findDue(new Date());

            for (const delivery of due) {
                try {
                    await this.#process(delivery);
                } catch (error) {
                    colors.error(`Error al procesar la entrega de webhook ${delivery.id_delivery}: ${error}`, { dateShow: false });
                }
            }
        } catch (error) {
            colors.error(`Error en el scheduler de entrega de webhooks: ${error}`, { dateShow: false });
        } finally {
            this.#running = false;
        }
    };

    async #process(delivery: WebhookDelivery): Promise<void> {
        const endpoint = await this._endpointsRepository.getByIdAsync(delivery.id_endpoint);
        if (endpoint === null || !endpoint.is_active) {
            await this.#giveUp(delivery, null, 'El endpoint del webhook no esta disponible');
            return;
        }

        const email = await this._emailsRepository.getByIdAsync(delivery.id_email);
        if (email === null) {
            await this.#giveUp(delivery, null, 'El correo de la entrega no existe');
            return;
        }

        // The signature is the HMAC-SHA256 hex of the EXACT serialized body:
        // build the payload object once and sign the string that goes out.
        // A queued row may carry its own prebuilt payload (S5 subscriptions):
        // it goes out verbatim; otherwise the delivery-status shape applies.
        const body = delivery.payload !== undefined && delivery.payload !== null && delivery.payload.trim() !== ''
            ? delivery.payload
            : JSON.stringify({
                event: delivery.event,
                email_uuid: email.email_uuid,
                short_code: email.short_code,
                attempts: email.attempts,
                subject: email.subject,
                to_email: email.to_email,
                sent_at: email.sent_at,
            });
        const signature = createHmac('sha256', endpoint.secret).update(body).digest('hex');

        const result = await this._httpDeliveryService.post({
            url: endpoint.url,
            body,
            headers: {
                'Content-Type': 'application/json',
                'X-Nexlify-Event': delivery.event,
                'X-Nexlify-Delivery': String(delivery.id_delivery),
                'X-Nexlify-Signature': signature,
            },
        });

        const attempt = delivery.attempt + 1;

        if (result.ok) {
            await this._deliveriesRepository.update(delivery.id_delivery, {
                attempt,
                ok: true,
                status_code: result.status_code,
                error: result.error,
                next_retry_at: null,
            });
            return;
        }

        if (attempt >= MAX_DELIVERY_ATTEMPTS) {
            await this.#giveUp(delivery, result);
            return;
        }

        await this._deliveriesRepository.update(delivery.id_delivery, {
            attempt,
            ok: null,
            status_code: result.status_code,
            error: result.error,
            next_retry_at: new Date(Date.now() + RETRY_INTERVAL_SECONDS * attempt * 1000),
        });
    }

    async #giveUp(delivery: WebhookDelivery, result: { status_code: number | null; error: string | null } | null, error: string | null = null): Promise<void> {
        await this._deliveriesRepository.update(delivery.id_delivery, {
            attempt: delivery.attempt + 1,
            ok: false,
            status_code: result?.status_code ?? null,
            error: result?.error ?? error,
            next_retry_at: null,
        });
    }
}
