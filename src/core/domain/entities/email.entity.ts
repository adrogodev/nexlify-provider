import { EmailDirectionEnum, EmailStateEnum } from "../enum";

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
        public updated_at: Nullable<Date>,
        public message_id: Nullable<string>,
        public direction: EmailDirectionEnum,
        public parent_email_id: Nullable<bigint>,
        /** Template used to render the email (S2). */
        public id_template?: Nullable<string>,
        /** JSON-serialized variables object used to render the template (S2). */
        public template_variables?: Nullable<string>,
        /** When a hard bounce / complaint was reported (S5). */
        public bounced_at?: Nullable<Date>,
    ) { }
}
