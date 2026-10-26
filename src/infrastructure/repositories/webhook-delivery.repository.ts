import { Injectable } from "@nestjs/common";
import type { IWebhookDeliveriesRepository } from "src/core/application/contracts/persistence/webhook-delivery.repository";
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
