import { EmailAttachment } from 'src/core/domain/entities/email-attachment.entity';
import type { EntityInput, IBaseRepository } from './base.repository';

export const EMAIL_ATTACHMENTS_REPOSITORY = Symbol('IEmailAttachmentsRepository');

export interface IEmailAttachmentsRepository extends IBaseRepository<EmailAttachment, 'id_attachment'> {
    /** id_attachment is DB-side autoincrement (allowed to omit on create). */
    create(entity: Omit<EntityInput<EmailAttachment, 'id_attachment'>, 'id_attachment'> & Partial<Pick<EmailAttachment, 'id_attachment'>>): Promise<EmailAttachment>;
    /** Every attachment row (metadata + base64 content) linked to an email. */
    findByEmail(id_email: bigint): Promise<EmailAttachment[]>;
}
