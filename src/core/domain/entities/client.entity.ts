export class Client {
    constructor(
        readonly id?: bigint,
        readonly id_state?: number,
        readonly name?: string,
        readonly email?: string,
        readonly cell_callsign?: string,
        readonly cell_phone?: string,
        readonly user_first_name?: string,
        readonly user_second_name?: string,
        readonly user_first_surname?: string,
        readonly user_secod_surname?: string,
        readonly created_at?: Date,
        readonly updated_at?: Date
    ) { }
}