import { EmailSendLog } from 'src/core/domain/entities/email-send-log.entity';
import type { IBaseRepository } from './base.repository';

export const EMAIL_SEND_LOGS_REPOSITORY = Symbol('IEmailSendLogsRepository');

export interface IEmailSendLogsRepository extends IBaseRepository<EmailSendLog, 'id_log'> {
    findByEmail(id_email: bigint): Promise<EmailSendLog[]>;
}
