import type { IEmailAttachmentsRepository, IEmailEventSubscriptionsRepository, IEmailsRepository, IWebhookDeliveriesRepository } from "src/core/application/contracts/persistence";
import type { IIdGenerator } from "src/core/application/contracts/infrastructure";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import type { Email } from "src/core/domain/entities/email.entity";
import { EmailDirectionEnum, EmailStateEnum, EmailEventEnum } from "src/core/domain/enum";
import type { InboundEmailInput } from "./inbound-email.request-data";

/** A single attachment that did NOT enter the ingestion, with its domain reason. */
export interface RejectedAttachmentDTO {
    filename: string;
    reason: string;
}

/** Always `received: true` for anything accepted under a valid signature. */
export interface InboundEmailResultDTO {
    received: true;
    email_uuid: string;
    /** True when the same inbound message_id had already been ingested (idempotent). */
    duplicate: boolean;
    parent_email_uuid: string | null;
    threaded: boolean;
    attachments_ingested: number;
    attachments_rejected: RejectedAttachmentDTO[];
}

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
/** Full uuid-shape match (an inbound message_id could be exactly one). */
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** uuid-shaped snippet (references tokens may carry an @domain suffix). */
const UUID_SNIPPET = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Provider-agnostic reception of replies over the shipped emails (S3):
 * threads the reply to the mapped email via in_reply_to_message_id (fallback:
 * first uuid-shaped token of `references`), inherits the parent's client on
 * match, otherwise stores a standalone RECEIVED email visible to admins.
 * Ingestion is idempotent per inbound message_id and one bad attachment never
 * aborts the whole ingestion.
 */
export class InboundEmailUseCase implements UseCase<InboundEmailInput, InboundEmailResultDTO> {
    constructor(
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _emailAttachmentsRepository: IEmailAttachmentsRepository,
        private readonly _idGenerator: IIdGenerator,
        private readonly _emailEventSubscriptionsRepository: IEmailEventSubscriptionsRepository,
        private readonly _webhookDeliveriesRepository: IWebhookDeliveriesRepository,
    ) { }

    public run = async (args: UseCaseArgs<InboundEmailInput>): Promise<InboundEmailResultDTO> => {
        const { data } = args;
        const messageId = this.#trimToNull(data.message_id);

        if (messageId !== null) {
            const existing = await this._emailsRepository.findByMessageId(messageId);
            if (existing !== null) {
                // Idempotent ingestion: an accepted message_id never creates a second row.
                return {
                    received: true,
                    email_uuid: existing.email_uuid,
                    duplicate: true,
                    parent_email_uuid: null,
                    threaded: existing.parent_email_id !== null,
                    attachments_ingested: 0,
                    attachments_rejected: [],
                };
            }
        }

        const parent = await this.#resolveParent(data);
        const created = await this._emailsRepository.create({
            short_code: this._idGenerator.generateShortCode(),
            id_client: parent?.id_client ?? null,
            from_email: data.sender,
            to_email: parent?.from_email ?? data.sender,
            subject: (data.subject ?? '').slice(0, 255),
            body_html: data.body_html ?? null,
            body_text: data.body_text ?? null,
            state: EmailStateEnum.RECEIVED,
            attempts: 0,
            next_retry_at: null,
            sent_at: null,
            message_id: messageId,
            direction: EmailDirectionEnum.RECEIVED,
            parent_email_id: parent?.id_email ?? null,
            created_at: data.received_at ?? new Date(),
        });

        const attachments = await this.#persistAttachments(created.id_email, data.attachments ?? []);

        // S5 fan-out: every matched ACTIVE subscription gets one queued row
        // whose stored payload carries ONLY the fields that subscription
        // enabled; the delivery itself rides the existing scheduler.
        await this.#fanOutReplyWebhooks(created, parent);

        return {
            received: true,
            email_uuid: created.email_uuid,
            duplicate: false,
            parent_email_uuid: parent?.email_uuid ?? null,
            threaded: parent !== null,
            attachments_ingested: attachments.ingested,
            attachments_rejected: attachments.rejected,
        };
    };

    /** Parent lookup: exact in_reply_to_message_id, otherwise the first uuid-shaped token of references. */
    async #resolveParent(data: InboundEmailInput): Promise<Email | null> {
        const inReplyTo = this.#trimToNull(data.in_reply_to_message_id);
        if (inReplyTo !== null) {
            // Providers echo the stored Message-ID verbatim (usually with angle
            // brackets); try as-is and bracket-stripped before giving up.
            const found = await this.#findByMessageIdAmong([inReplyTo, this.#stripBracketPair(inReplyTo)]);
            if (found !== null) {
                return found;
            }
        }
        if (typeof data.references === 'string' && data.references.trim() !== '') {
            return await this.#resolveFromReferences(data.references);
        }
        return null;
    }

    /** Picks the uuid-shaped token first (per spec), then the plain first token. */
    async #resolveFromReferences(references: string): Promise<Email | null> {
        const tokens = references.split(/\s+/).filter((token) => token.replace(/[<>]/g, '').trim() !== '');
        const stripped = (tokens ?? []).map((token) => this.#stripBracketPair(token));
        const uuidShapedIndex = stripped.findIndex((token) => UUID_SNIPPET.test(token));
        const priorityIndex = uuidShapedIndex !== -1 ? uuidShapedIndex : 0;
        const chosenRaw = tokens[priorityIndex];
        if (chosenRaw === undefined) {
            return null;
        }
        const chosenStripped = stripped[priorityIndex];
        const candidates = [chosenRaw, chosenStripped];
        const bareUuid = UUID_SHAPE.exec(chosenStripped);
        if (bareUuid !== null) {
            candidates.push(bareUuid[0]);
        }
        return await this.#findByMessageIdAmong(candidates);
    }

    async #findByMessageIdAmong(candidates: string[]): Promise<Email | null> {
        for (const candidate of candidates) {
            if (candidate === '') continue;
            const found = await this._emailsRepository.findByMessageId(candidate);
            if (found !== null) {
                return found;
            }
        }
        return null;
    }

    #stripBracketPair(token: string): string {
        return token.replace(/[<>]/g, '').trim();
    }

    async #persistAttachments(id_email: bigint, attachments: NonNullable<InboundEmailInput['attachments']>): Promise<{ ingested: number; rejected: RejectedAttachmentDTO[] }> {
        let ingested = 0;
        const rejected: RejectedAttachmentDTO[] = [];

        for (const attachment of attachments) {
            const filename = attachment.filename.slice(0, 255);
            try {
                const size_bytes = this.#attachmentSize(attachment);
                if (size_bytes !== null && size_bytes > MAX_ATTACHMENT_BYTES) {
                    // One oversized attachment never aborts the whole ingestion.
                    rejected.push({
                        filename,
                        reason: `El archivo "${filename}" excede el tamano maximo de 5MB`,
                    });
                    continue;
                }

                await this._emailAttachmentsRepository.create({
                    id_email,
                    filename,
                    content_type: attachment.contentType !== undefined ? attachment.contentType.slice(0, 100) : null,
                    size_bytes,
                    content: attachment.content ?? null,
                });
                ingested++;
            } catch {
                rejected.push({
                    filename,
                    reason: `No se pudo registrar el archivo "${filename}"`,
                });
            }
        }

        return { ingested, rejected };
    }

    /** Explicit declared size wins; otherwise the decoded base64 length. `null` when unknowable. */
    #attachmentSize(attachment: NonNullable<InboundEmailInput['attachments']>[number]): number | null {
        if (typeof attachment.size === 'number') {
            return attachment.size;
        }
        if (typeof attachment.content === 'string' && attachment.content !== '') {
            return Buffer.from(attachment.content, 'base64').length;
        }
        return null;
    }

    #trimToNull(value: string | undefined): string | null {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
    }

    /**
     * Queues one webhook_deliveries row per subscription of the parent's
     * client that is ACTIVE and subscribing to RECEIVED_REPLY. The stored
     * payload carries ONLY the fields that subscription enabled; the delivery
     * itself rides the existing scheduler. A fan-out failure never rejects
     * the ingestion that already succeeded.
     */
    async #fanOutReplyWebhooks(reply: Email, parent: Email | null): Promise<void> {
        try {
            if (parent === null || parent.id_client === null) {
                return;
            }
            const subscriptions = await this._emailEventSubscriptionsRepository.findActiveByClientIdAndEvent(
                parent.id_client,
                EmailEventEnum.RECEIVED_REPLY,
            );
            if (subscriptions.length === 0) {
                return;
            }
            const attachments = await this._emailAttachmentsRepository.findByEmail(reply.id_email);

            for (const subscription of subscriptions) {
                await this._webhookDeliveriesRepository.create({
                    id_endpoint: subscription.id_webhook_endpoint,
                    id_email: reply.id_email,
                    event: EmailEventEnum.RECEIVED_REPLY,
                    payload: this.#buildReplyPayload(reply, parent, attachments, subscription),
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
    }

    /**
     * The webhook notification body (S5): `event`, the reply uuid, the parent
     * link and `received_at` always travel; sender, recipients (from/to),
     * dates, body and attachment metadata ONLY when the subscription enables
     * them. Attachment metadata never includes the binary content.
     */
    #buildReplyPayload(reply: Email, parent: Email, attachments: Awaited<ReturnType<IEmailAttachmentsRepository['findByEmail']>>, subscription: { include_body: boolean; include_dates: boolean; include_sender: boolean; include_recipients: boolean; include_attachments: boolean }): string {
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
            payload['recipients'] = { from: reply.from_email, to: reply.to_email };
        }
        if (subscription.include_dates) {
            payload['dates'] = { sent_at: reply.sent_at, received_at: receivedAt };
        }
        if (subscription.include_body) {
            payload['body'] = { text: reply.body_text ?? null, html: reply.body_html ?? null };
        }
        if (subscription.include_attachments) {
            payload['attachments'] = attachments.map((attachment) => ({
                filename: attachment.filename,
                size_bytes: attachment.size_bytes,
                content_type: attachment.content_type,
            }));
        }

        return JSON.stringify(payload);
    }
}
