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
    /** email_uuid is DB-side generated (gen_random_uuid): allowed to omit on create. */
    create(entity: Omit<EntityInput<Email, 'id_email'>, 'email_uuid'> & Partial<Pick<Email, 'email_uuid'>>): Promise<Email>;
    findByUuidOrShortCode(identifier: string): Promise<Email | null>;
    findRetryable(nextRetryBefore: Date): Promise<Email[]>;
    countSentOn(from: Date, to: Date): Promise<number>;
    getAllWithFilters(filters: GetEmailsFilters): Promise<Email[]>;
    countWithFilters(filters: GetEmailsFilters): Promise<number>;
}
