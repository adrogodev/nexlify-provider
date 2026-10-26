export class EmailSendLog {
    constructor(
        public id_log: bigint,
        public id_email: bigint,
        public attempt: number,
        public level: Nullable<EmailLogLevelEnum>,
        public message: string,
        public smtp_host: Nullable<string>,
        public created_at: Nullable<Date>
    ) { }
}
