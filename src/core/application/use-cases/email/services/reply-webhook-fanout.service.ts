import type {
    IEmailAttachmentsRepository,
    IEmailEventSubscriptionsRepository,
    IWebhookDeliveriesRepository,
} from 'src/core/application/contracts/persistence';
import type { EmailEventSubscription } from 'src/core/domain/entities/email-event-subscription.entity';
import type { Email } from 'src/core/domain/entities/email.entity';
import { EmailEventEnum } from 'src/core/domain/enum';
import type { AiAnalysisDTO } from '../analyze-reply/ai-analysis.dto';

type SubscriptionFlags = Pick<
    EmailEventSubscription,
    | 'include_body'
    | 'include_dates'
    | 'include_sender'
    | 'include_recipients'
    | 'include_attachments'
> & { include_ai_analysis?: boolean };

/**
 * RECEIVED_REPLY fan-out (S5 subscriptions): queues one webhook_deliveries
 * row per ACTIVE subscription of the parent's client whose events include
 * RECEIVED_REPLY. The stored payload carries ONLY the fields that
 * subscription enabled; the delivery itself rides the existing scheduler.
 * A fan-out failure never rejects the caller.
 */
export class ReplyWebhookFanOutService {
    constructor(
        private readonly _emailAttachmentsRepository: IEmailAttachmentsRepository,
        private readonly _emailEventSubscriptionsRepository: IEmailEventSubscriptionsRepository,
        private readonly _webhookDeliveriesRepository: IWebhookDeliveriesRepository,
    ) {}

    /**
     * `aiAnalysis` is attached as `ai_analysis` only for subscriptions with
     * `include_ai_analysis` (null when the analysis is disabled or failed).
     */
    public fanOut = async (
        reply: Email,
        parent: Email | null,
        aiAnalysis: AiAnalysisDTO | null = null,
    ): Promise<void> => {
        try {
            if (
                parent === null ||
                parent.id_client === null ||
                parent.id_client === undefined
            ) {
                return;
            }
            const subscriptions =
                await this._emailEventSubscriptionsRepository.findActiveByClientIdAndEvent(
                    parent.id_client,
                    EmailEventEnum.RECEIVED_REPLY,
                );
            if (subscriptions.length === 0) {
                return;
            }
            const attachments =
                await this._emailAttachmentsRepository.findByEmail(
                    reply.id_email,
                );

            for (const subscription of subscriptions) {
                await this._webhookDeliveriesRepository.create({
                    id_endpoint: subscription.id_webhook_endpoint,
                    id_email: reply.id_email,
                    event: EmailEventEnum.RECEIVED_REPLY,
                    payload: this.buildReplyPayload(
                        reply,
                        parent,
                        attachments,
                        subscription,
                        aiAnalysis,
                    ),
                    attempt: 0,
                    ok: null,
                    status_code: null,
                    error: null,
                    next_retry_at: new Date(),
                });
            }
        } catch {
            // Fan-out enqueue failure must never break the ingestion outcome.
        }
    };

    /**
     * The webhook notification body: `event`, the reply uuid, the parent link
     * and `received_at` always travel; sender, recipients (from/to), dates,
     * body, attachment metadata and the AI analysis ONLY when the
     * subscription enables them. Attachment metadata never includes content.
     */
    public buildReplyPayload(
        reply: Email,
        parent: Email,
        attachments: Awaited<
            ReturnType<IEmailAttachmentsRepository['findByEmail']>
        >,
        subscription: SubscriptionFlags,
        aiAnalysis: AiAnalysisDTO | null = null,
    ): string {
        const receivedAt = reply.created_at;
        const payload: Record<string, unknown> = {
            event: EmailEventEnum.RECEIVED_REPLY,
            email_uuid: reply.email_uuid,
            parent: {
                email_uuid: parent.email_uuid,
                short_code: parent.short_code,
            },
            received_at: receivedAt,
        };

        if (subscription.include_sender) {
            payload['sender'] = reply.from_email;
        }
        if (subscription.include_recipients) {
            payload['recipients'] = {
                from: reply.from_email,
                to: reply.to_email,
            };
        }
        if (subscription.include_dates) {
            payload['dates'] = {
                sent_at: reply.sent_at,
                received_at: receivedAt,
            };
        }
        if (subscription.include_body) {
            payload['body'] = {
                text: reply.body_text ?? null,
                html: reply.body_html ?? null,
            };
        }
        if (subscription.include_attachments) {
            payload['attachments'] = attachments.map((attachment) => ({
                filename: attachment.filename,
                size_bytes: attachment.size_bytes,
                content_type: attachment.content_type,
            }));
        }
        if (subscription.include_ai_analysis === true) {
            payload['ai_analysis'] = aiAnalysis;
        }

        return JSON.stringify(payload);
    }
}
