import { EmailDirectionEnum, EmailLogLevelEnum, EmailStateEnum } from "src/core/domain/enum";

export interface EmailAttachmentMetadataDTO {
    filename: string,
    content_type: string | null,
    size_bytes: number | null
}

export interface EmailAttachmentContentDTO extends EmailAttachmentMetadataDTO {
    /** The stored base64 of the file; null when the ingestion did not persist binary content. */
    content_base64: string | null
}

export interface EmailDTO {
    email_uuid: string,
    short_code: string,
    id_client: number | null,
    from_email: string,
    to_email: string,
    subject: string,
    state: EmailStateEnum | null,
    attempts: number | null,
    next_retry_at: Date | null,
    sent_at: Date | null,
    created_at: Date | null,
    direction: EmailDirectionEnum | null
}

export interface EmailListItemDTO {
    email_uuid: string,
    short_code: string,
    to_email: string,
    subject: string,
    state: EmailStateEnum | null,
    attempts: number | null,
    created_at: Date | null
}

export interface EmailSendLogDTO {
    id_log: number | string,
    attempt: number,
    level: EmailLogLevelEnum | null,
    message: string,
    smtp_host: string | null,
    created_at: Date | null
}

export interface EmailDetailDTO extends EmailDTO {
    logs: EmailSendLogDTO[],
    parent_email_uuid: string | null,
    attachments: EmailAttachmentMetadataDTO[]
}

export interface SendEmailResultDTO {
    email_uuid: string,
    short_code: string,
    state: EmailStateEnum,
    attempts: number
}
