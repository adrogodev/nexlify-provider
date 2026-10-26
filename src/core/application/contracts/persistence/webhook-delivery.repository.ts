import type { IBaseRepository } from './base.repository';
import { WebhookDelivery } from 'src/core/domain/entities/webhook-delivery.entity';

export const WEBHOOK_DELIVERIES_REPOSITORY = Symbol('IWebhookDeliveriesRepository');

export interface IWebhookDeliveriesRepository extends IBaseRepository<WebhookDelivery, 'id_delivery'> {
    /** Deliveries whose retry schedule is due and that are not delivered yet. */
    findDue(before: Date): Promise<WebhookDelivery[]>;
}
