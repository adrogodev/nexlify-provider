import { Email } from "src/core/domain/entities/email.entity";
import { EmailAttachment } from "src/core/domain/entities/email-attachment.entity";
import { EmailSendLog } from "src/core/domain/entities/email-send-log.entity";
import { EmailAttachmentMetadataDTO, EmailDetailDTO, EmailDTO, EmailListItemDTO, EmailSendLogDTO } from "../dtos";

export class EmailMapper {
    public static mapEmail(email: Email): EmailDTO {
        return {
            email_uuid: email.email_uuid,
            short_code: email.short_code,
            id_client: email.id_client === null ? null : Number(email.id_client),
            from_email: email.from_email,
            to_email: email.to_email,
            subject: email.subject,
            state: email.state,
            attempts: email.attempts,
            next_retry_at: email.next_retry_at,
            sent_at: email.sent_at,
            created_at: email.created_at,
            direction: email.direction
        };
    }

    public static mapEmailListItem(email: Email): EmailListItemDTO {
        return {
            email_uuid: email.email_uuid,
            short_code: email.short_code,
            to_email: email.to_email,
            subject: email.subject,
            state: email.state,
            attempts: email.attempts,
            created_at: email.created_at
        };
    }

    public static mapEmailDetail(email: Email, logs: EmailSendLog[], attachments: EmailAttachment[] = [], parentEmailUuid: string | null = null): EmailDetailDTO {
        return {
            ...EmailMapper.mapEmail(email),
            logs: logs.map((log): EmailSendLogDTO => ({
                id_log: log.id_log.toString(),
                attempt: log.attempt,
                level: log.level,
                message: log.message,
                smtp_host: log.smtp_host,
                created_at: log.created_at
            })),
            parent_email_uuid: parentEmailUuid,
            attachments: attachments.map((attachment): EmailAttachmentMetadataDTO => ({
                filename: attachment.filename,
                content_type: attachment.content_type,
                size_bytes: attachment.size_bytes
            }))
        };
    }
}
