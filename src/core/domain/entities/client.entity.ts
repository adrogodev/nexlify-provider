export class Client {
    constructor(
        readonly id_client: bigint,
        readonly id_state: Nullable<number>,
        readonly id_type: Nullable<number>,
        readonly id_number: Nullable<string>,
        readonly name: Nullable<string>,
        readonly email: Nullable<string>,
        readonly cell_callsign: Nullable<string>,
        readonly cell_phone: Nullable<string>,
        readonly user_first_name: Nullable<string>,
        readonly user_second_name: Nullable<string>,
        readonly user_first_surname: Nullable<string>,
        readonly user_second_surname: Nullable<string>,
        readonly created_at: Nullable<Date>,
        readonly updated_at: Nullable<Date>
    ) { }
}
