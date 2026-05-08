export class NexlifyConfiguration {
    constructor(
        readonly id: bigint,
        readonly sender_email: string,
        readonly sender_name: string,
        readonly reply_to_email: Nullable<string>,
        readonly mail_application_password: Nullable<string>,
        readonly id_smtp_server: Nullable<bigint>,
        readonly daily_send_limit: Nullable<number>,
        readonly max_retries: Nullable<number>,
        readonly retry_interval_seconds: Nullable<number>,
        readonly email_header_text: Nullable<string>,
        readonly email_header_html: Nullable<string>,
        readonly email_header_img_url: Nullable<string>,
        readonly email_footer_text: Nullable<string>,
        readonly email_footer_html: Nullable<string>,
        readonly email_footer_img_url: Nullable<string>,
        readonly created_at: Nullable<Date>,
        readonly updated_at: Nullable<Date>,
    ) { }
}