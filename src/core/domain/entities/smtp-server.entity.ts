export class SmtpServers {
    constructor(
        readonly id_smpt_server: bigint,
        readonly provider: Nullable<string>,
        readonly name: Nullable<string>,
        readonly port: Nullable<number>,
        readonly state: Nullable<boolean>,
        readonly created_at: Nullable<Date>,
        readonly updated_at: Nullable<Date>
    ) { }
}
