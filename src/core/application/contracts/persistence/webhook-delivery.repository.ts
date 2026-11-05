import type { IBaseRepository } from './base.repository';
import { WebhookDelivery } from 'src/core/domain/entities/webhook-delivery.entity';

export const WEBHOOK_DELIVERIES_REPOSITORY = Symbol('IWebhookDeliveriesRepository');

export interface IWebhookDeliveriesRepository extends IBaseRepository<WebhookDelivery, 'id_delivery'> {
    /** Deliveries whose retry schedule is due and that are not delivered yet. */
    findDue(before: Date): Promise<WebhookDelivery[]>;
    /** Delivery history of one endpoint, newest first, with the email short code (S9). */
    findPageByEndpoint(idEndpoint: bigint, page: number, limit: number): Promise<WebhookDeliveryHistoryRow[]>;
    countByEndpoint(idEndpoint: bigint): Promise<number>;
}

export type WebhookDeliveryHistoryRow = WebhookDelivery & { short_code: string | null };
