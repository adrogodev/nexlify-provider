export interface NexlifyConfigurationDto {
    sender: SenderData,
    smtp: SMTPData,
    limits: LimitData,
    template: EmailTemplate
}

interface SenderData {
    sender_email: string,
    sender_name: string;
    reply_to_email: Nullable<string>;
    mail_application_password: string
}

interface SMTPData {
    provider?: Nullable<string>;
    name?: Nullable<string>,
    port?: Nullable<number>
}

interface LimitData {
    daily_send_limit: number,
    max_retries: number,
    retry_interval_seconds: number
}

interface EmailTemplate {
    header: Nullable<HeaderData>,
    footer: Nullable<FooterData>
}

interface HeaderData {
    email_header_text?: Nullable<string>;
    email_header_html?: Nullable<string>;
    email_header_img_url?: Nullable<string>;
}

interface FooterData {
    email_footer_text?: Nullable<string>;
    email_footer_html?: Nullable<string>;
    email_footer_img_url?: Nullable<string>;
}