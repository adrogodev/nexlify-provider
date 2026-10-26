import { EmailEventSubscription } from 'src/core/domain/entities/email-event-subscription.entity';
import type { EntityInput, IBaseRepository } from './base.repository';

export const EMAIL_EVENT_SUBSCRIPTIONS_REPOSITORY = Symbol('IEmailEventSubscriptionsRepository');

export interface IEmailEventSubscriptionsRepository extends IBaseRepository<EmailEventSubscription, 'id_subscription'> {
    /** subscription_uuid is DB-side generated (gen_random_uuid): allowed to omit on create. */
    create(entity: Omit<EntityInput<EmailEventSubscription, 'id_subscription'>, 'subscription_uuid'> & Partial<Pick<EmailEventSubscription, 'subscription_uuid'>>): Promise<EmailEventSubscription>;
    findByUuid(subscriptionUuid: string): Promise<EmailEventSubscription | null>;
    /** Every subscription registered for a client, active or not. */
    findAllByClientId(idClient: bigint): Promise<EmailEventSubscription[]>;
    /** Active subscriptions only: the fan-out target set for email events. */
    findActiveByClientId(idClient: bigint): Promise<EmailEventSubscription[]>;
}
