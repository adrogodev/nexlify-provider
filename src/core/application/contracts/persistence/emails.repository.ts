import { Email } from 'src/core/domain/entities/email.entity';
import type { EntityInput, IBaseRepository } from './base.repository';
import { EmailStateEnum } from 'src/core/domain/enum';

export const EMAILS_REPOSITORY = Symbol('IEmailsRepository');

export interface GetEmailsFilters {
    state?: EmailStateEnum;
    id_client?: bigint;
    from_date?: Date;
    to_date?: Date;
    short_code?: string;
    page?: number;
    limit?: number;
}

export interface IEmailsRepository extends IBaseRepository<Email, 'id_email'> {
    /**
     * Outbound creates may omit email_uuid (gen_random_uuid), message_id
     * (captured from the transport after the send), direction (DB default
     * SENT) and parent_email_id (null). Inbound ingestion passes message_id,
     * direction, parent_email_id and created_at (received_at carrier) instead.
     */
    create(entity: Omit<EntityInput<Email, 'id_email'>, 'email_uuid' | 'message_id' | 'direction' | 'parent_email_id'> & Partial<Pick<Email, 'email_uuid' | 'message_id' | 'direction' | 'parent_email_id' | 'created_at'>>): Promise<Email>;
    findByUuidOrShortCode(identifier: string): Promise<Email | null>;
    /** Resolves an email row by its captured nodemailer Message-ID (inbound threading key). */
    findByMessageId(messageId: string): Promise<Email | null>;
    findQueued(limit: number): Promise<Email[]>;
    findRetryable(nextRetryBefore: Date): Promise<Email[]>;
    countSentOn(from: Date, to: Date): Promise<number>;
    getAllWithFilters(filters: GetEmailsFilters): Promise<Email[]>;
    countWithFilters(filters: GetEmailsFilters): Promise<number>;
}
