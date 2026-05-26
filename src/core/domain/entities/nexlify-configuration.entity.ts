export class NexlifyConfiguration {
    constructor(
        public id_configuration: bigint,
        public sender_email: string,
        public sender_name: Nullable<string>,
        public reply_to_email: Nullable<string>,
        public mail_application_password: Nullable<string>,
        public id_smtp_server: Nullable<bigint>,
        public client_id: Nullable<string>,
        public client_secret: Nullable<string>,
        public tenant_id: Nullable<string>,
        public refresh_token: Nullable<string>,
        public daily_send_limit: Nullable<number>,
        public max_retries: Nullable<number>,
        public retry_interval_seconds: Nullable<number>,
        public email_header_text: Nullable<string>,
        public email_header_html: Nullable<string>,
        public email_header_img_url: Nullable<string>,
        public email_footer_text: Nullable<string>,
        public email_footer_html: Nullable<string>,
        public email_footer_img_url: Nullable<string>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>
    ) { }
}
