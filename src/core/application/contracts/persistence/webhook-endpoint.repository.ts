import type { EntityInput, IBaseRepository } from './base.repository';
import { WebhookEndpoint } from 'src/core/domain/entities/webhook-endpoint.entity';

export const WEBHOOK_ENDPOINTS_REPOSITORY = Symbol('IWebhookEndpointsRepository');

export interface IWebhookEndpointsRepository extends IBaseRepository<WebhookEndpoint, 'id_endpoint'> {
    /** endpoint_uuid is DB-side generated (gen_random_uuid): allowed to omit on create. */
    create(entity: Omit<EntityInput<WebhookEndpoint, 'id_endpoint'>, 'endpoint_uuid'> & Partial<Pick<WebhookEndpoint, 'endpoint_uuid'>>): Promise<WebhookEndpoint>;
    findByUuid(endpointUuid: string): Promise<WebhookEndpoint | null>;
    /** Every endpoint (active or not) registered for a client. */
    findAllByClientId(idClient: bigint): Promise<WebhookEndpoint[]>;
    /** Active endpoints only: the enqueue target set for delivery-status webhooks. */
    findActiveByClientId(idClient: bigint): Promise<WebhookEndpoint[]>;
}
