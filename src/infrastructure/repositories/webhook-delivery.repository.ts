import { Injectable } from "@nestjs/common";
import type { IWebhookDeliveriesRepository, WebhookDeliveryHistoryRow } from "src/core/application/contracts/persistence/webhook-delivery.repository";
import { WebhookDelivery } from "src/core/domain/entities/webhook-delivery.entity";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";

@Injectable()
export class WebhookDeliveriesRepository extends BaseRepository<WebhookDelivery, 'id_delivery'> implements IWebhookDeliveriesRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'webhook_deliveries', 'id_delivery');
    }

    public async findDue(before: Date): Promise<WebhookDelivery[]> {
        return await this._model.findMany({
            where: this.#buildDueFilters(before),
            orderBy: { next_retry_at: 'asc' },
        });
    }

    public async findPageByEndpoint(idEndpoint: bigint, page: number, limit: number): Promise<WebhookDeliveryHistoryRow[]> {
        const take = Math.min(100, Math.max(1, limit));
        const rows: WebhookDelivery[] = await this._model.findMany({
            where: { id_endpoint: idEndpoint },
            orderBy: { id_delivery: 'desc' },
            skip: (Math.max(1, page) - 1) * take,
            take,
        });
        if (rows.length === 0) return [];
        // No FK relation in the schema: one batched lookup resolves the short codes.
        const emails: Array<{ id_email: bigint; short_code: string }> = await (this._transaction ?? this.prisma).emails.findMany({
            where: { id_email: { in: [...new Set(rows.map((row) => row.id_email))] } },
            select: { id_email: true, short_code: true },
        });
        const shortCodes = new Map(emails.map((email) => [email.id_email, email.short_code]));
        return rows.map((row) => ({ ...row, short_code: shortCodes.get(row.id_email) ?? null }));
    }

    public async countByEndpoint(idEndpoint: bigint): Promise<number> {
        return await this._model.count({ where: { id_endpoint: idEndpoint } });
    }

    // Delivered rows (ok=true) lose their schedule, so `next_retry_at` alone
    // gates the work; the not-true filter also spares freshly given-up rows.
    #buildDueFilters(before: Date): Record<string, unknown> {
        return {
            next_retry_at: { lte: before },
            OR: [
                { ok: null },
                { ok: false },
            ],
        };
    }
}
