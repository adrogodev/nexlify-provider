import { EmailStateEnum, EmailLogLevelEnum } from "src/core/domain/enum";

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
    created_at: Date | null
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
    logs: EmailSendLogDTO[]
}

export interface SendEmailResultDTO {
    email_uuid: string,
    short_code: string,
    state: EmailStateEnum,
    attempts: number
}
