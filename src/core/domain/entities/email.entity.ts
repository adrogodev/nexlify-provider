export class Email {
    constructor(
        public id_email: bigint,
        public email_uuid: string,
        public short_code: string,
        public id_client: Nullable<bigint>,
        public from_email: string,
        public to_email: string,
        public subject: string,
        public body_html: Nullable<string>,
        public body_text: Nullable<string>,
        public state: Nullable<EmailStateEnum>,
        public attempts: Nullable<number>,
        public next_retry_at: Nullable<Date>,
        public sent_at: Nullable<Date>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>
    ) { }
}
