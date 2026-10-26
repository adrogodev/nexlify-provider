import { Email } from 'src/core/domain/entities/email.entity';
import type { IBaseRepository } from './base.repository';
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
    findByUuidOrShortCode(identifier: string): Promise<Email | null>;
    findRetryable(nextRetryBefore: Date): Promise<Email[]>;
    countSentOn(from: Date, to: Date): Promise<number>;
    getAllWithFilters(filters: GetEmailsFilters): Promise<Email[]>;
    countWithFilters(filters: GetEmailsFilters): Promise<number>;
}
