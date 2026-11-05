import type {
    IRequestContext,
    IWebhookSigner,
} from 'src/core/application/contracts/infrastructure';
import type {
    IWebhookDeliveriesRepository,
    IWebhookEndpointsRepository,
} from 'src/core/application/contracts/persistence';
import type { IHttpDeliveryService } from 'src/core/application/contracts/services/http-delivery.service';
import type { PaginateBaseDTO } from 'src/core/application/dtos';
import type { WebhookEndpoint } from 'src/core/domain/entities/webhook-endpoint.entity';
import {
    ActionNotAllowedException,
    NotFoundException,
} from 'src/core/domain/exceptions';
import type { TokenInfo, UseCase, UseCaseArgs } from 'src/core/domain/models';
import type { ListWebhookDeliveriesInput } from './webhook-deliveries.request-data';

export const WEBHOOK_PING_EVENT = 'ping';
const DEFAULT_PAGE_SIZE = 20;

export interface WebhookDeliveryItemDTO {
    id_delivery: string;
    event: string;
    attempt: number;
    ok: boolean | null;
    status_code: number | null;
    error: string | null;
    next_retry_at: Date | null;
    created_at: Date | null;
    short_code: string | null;
}

export interface RedeliverResultDTO {
    queued: true;
}

export interface WebhookTestResultDTO {
    ok: boolean;
    status_code: number | null;
    error: string | null;
    duration_ms: number;
}

function assertEndpointOwner(
    auth: TokenInfo | null | undefined,
    endpoint: WebhookEndpoint | null,
): WebhookEndpoint {
    if (endpoint === null) {
        throw new NotFoundException('Endpoint de webhook no encontrado');
    }
    if (auth?.is_admin === true) return endpoint;
    if (
        auth === null ||
        auth === undefined ||
        endpoint.id_client !== BigInt(auth.id_user)
    ) {
        throw new ActionNotAllowedException(
            'Solo el propietario o un administrador puede operar el webhook',
        );
    }
    return endpoint;
}

/** `GET api/webhooks/:endpointUuid/deliveries` (S9): paginated history, newest first. */
export class ListWebhookDeliveriesUseCase
    implements
        UseCase<
            ListWebhookDeliveriesInput,
            PaginateBaseDTO<WebhookDeliveryItemDTO[]>
        >
{
    constructor(
        private readonly _context: IRequestContext,
        private readonly _webhookEndpointsRepository: IWebhookEndpointsRepository,
        private readonly _webhookDeliveriesRepository: IWebhookDeliveriesRepository,
    ) {}

    public run = async (
        args: UseCaseArgs<ListWebhookDeliveriesInput>,
    ): Promise<PaginateBaseDTO<WebhookDeliveryItemDTO[]>> => {
        const endpoint = assertEndpointOwner(
            this._context.get(),
            await this._webhookEndpointsRepository.findByUuid(
                args.data.endpoint_uuid,
            ),
        );
        const page = Math.max(1, args.data.page ?? 1);
        const limit = Math.min(
            100,
            Math.max(1, args.data.limit ?? DEFAULT_PAGE_SIZE),
        );

        const [total_items, rows] = await Promise.all([
            this._webhookDeliveriesRepository.countByEndpoint(
                endpoint.id_endpoint,
            ),
            this._webhookDeliveriesRepository.findPageByEndpoint(
                endpoint.id_endpoint,
                page,
                limit,
            ),
        ]);

        return {
            total_items,
            page,
            data: rows.map((row) => ({
                id_delivery: row.id_delivery.toString(),
                event: row.event,
                attempt: row.attempt,
                ok: row.ok,
                status_code: row.status_code,
                error: row.error,
                next_retry_at: row.next_retry_at,
                created_at: row.created_at,
                short_code: row.short_code,
            })),
        };
    };
}

/**
 * `POST api/webhooks/deliveries/:deliveryId/redeliver` (S9): resets the SAME
 * row (attempt 0, ok/status/error cleared, next_retry_at now) so the existing
 * scheduler ships it again on its next tick with the stored payload. The
 * history therefore shows the latest outcome of that delivery.
 */
export class RedeliverWebhookDeliveryUseCase
    implements UseCase<string, RedeliverResultDTO>
{
    constructor(
        private readonly _context: IRequestContext,
        private readonly _webhookEndpointsRepository: IWebhookEndpointsRepository,
        private readonly _webhookDeliveriesRepository: IWebhookDeliveriesRepository,
    ) {}

    public run = async (
        args: UseCaseArgs<string>,
    ): Promise<RedeliverResultDTO> => {
        const delivery = await this._webhookDeliveriesRepository.getByIdAsync(
            BigInt(args.data),
        );
        if (delivery === null) {
            throw new NotFoundException('Entrega de webhook no encontrada');
        }
        const endpoint = assertEndpointOwner(
            this._context.get(),
            await this._webhookEndpointsRepository.getByIdAsync(
                delivery.id_endpoint,
            ),
        );
        if (!endpoint.is_active) {
            throw new ActionNotAllowedException(
                'El endpoint del webhook no esta activo',
            );
        }

        await this._webhookDeliveriesRepository.update(delivery.id_delivery, {
            attempt: 0,
            ok: null,
            status_code: null,
            error: null,
            next_retry_at: new Date(),
        });

        return { queued: true };
    };
}

/**
 * `POST api/webhooks/:endpointUuid/test` (S9): synchronous signed `ping`
 * with the same headers and HMAC as real deliveries. Nothing is persisted.
 */
export class TestWebhookEndpointUseCase
    implements UseCase<string, WebhookTestResultDTO>
{
    constructor(
        private readonly _context: IRequestContext,
        private readonly _webhookEndpointsRepository: IWebhookEndpointsRepository,
        private readonly _httpDeliveryService: IHttpDeliveryService,
        private readonly _webhookSigner: IWebhookSigner,
        private readonly _now: () => number = () => Date.now(),
    ) {}

    public run = async (
        args: UseCaseArgs<string>,
    ): Promise<WebhookTestResultDTO> => {
        const endpoint = assertEndpointOwner(
            this._context.get(),
            await this._webhookEndpointsRepository.findByUuid(args.data),
        );

        const body = JSON.stringify({
            event: WEBHOOK_PING_EVENT,
            endpoint_uuid: endpoint.endpoint_uuid,
            sent_at: new Date(this._now()).toISOString(),
        });
        const startedAt = this._now();
        const result = await this._httpDeliveryService.post({
            url: endpoint.url,
            body,
            headers: {
                'Content-Type': 'application/json',
                'X-Nexlify-Event': WEBHOOK_PING_EVENT,
                'X-Nexlify-Delivery': `test-${startedAt}`,
                'X-Nexlify-Signature': this._webhookSigner.sign(
                    endpoint.secret,
                    body,
                ),
            },
        });

        return {
            ok: result.ok,
            status_code: result.status_code,
            error: result.error,
            duration_ms: Math.max(0, this._now() - startedAt),
        };
    };
}
