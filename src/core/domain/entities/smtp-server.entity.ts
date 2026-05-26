export class SmtpServers {
    constructor(
        public id_smpt_server: bigint,
        public provider: Nullable<string>,
        public host: Nullable<string>,
        public port: Nullable<number>,
        public auth_type: Nullable<string>,
        public state: Nullable<boolean>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>
    ) { }
}
