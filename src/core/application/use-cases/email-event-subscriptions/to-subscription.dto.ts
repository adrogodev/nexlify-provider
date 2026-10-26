import type { EmailEventSubscription } from "src/core/domain/entities/email-event-subscription.entity";
import { EmailEventEnum } from "src/core/domain/enum";

/** Listing/management shape: events come back as the parsed enum array. */
export interface SubscriptionDTO {
    subscription_uuid: string;
    id_client: number;
    events: EmailEventEnum[];
    include_body: boolean;
    include_dates: boolean;
    include_sender: boolean;
    include_recipients: boolean;
    include_attachments: boolean;
    is_active: boolean;
    created_at: Date | null;
    updated_at: Date | null;
}

/** Splits the stored comma list back into enum values, skipping legacy/unknown tokens. */
export function parseSubscriptionEvents(events: string): EmailEventEnum[] {
    return events
        .split(',')
        .map((token) => token.trim())
        .filter((token): token is EmailEventEnum => Object.values(EmailEventEnum).includes(token as EmailEventEnum));
}

export function toSubscriptionDTO(subscription: EmailEventSubscription): SubscriptionDTO {
    return {
        subscription_uuid: subscription.subscription_uuid,
        id_client: Number(subscription.id_client),
        events: parseSubscriptionEvents(subscription.events),
        include_body: subscription.include_body,
        include_dates: subscription.include_dates,
        include_sender: subscription.include_sender,
        include_recipients: subscription.include_recipients,
        include_attachments: subscription.include_attachments,
        is_active: subscription.is_active,
        created_at: subscription.created_at,
        updated_at: subscription.updated_at,
    };
}
