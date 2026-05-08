export class SmtpServers {
    constructor(
        readonly id?: number,
        readonly provider?: string,
        readonly name?: string,
        readonly port?: number,
        readonly created_at?: Date,
        readonly updated_at?: Date
    ) { }
}