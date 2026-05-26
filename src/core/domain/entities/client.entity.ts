export class Client {
    constructor(
        public id_client: bigint,
        public id_state: Nullable<number>,
        public id_type: Nullable<number>,
        public id_number: Nullable<string>,
        public name: Nullable<string>,
        public email: Nullable<string>,
        public cell_callsign: Nullable<string>,
        public cell_phone: Nullable<string>,
        public user_first_name: Nullable<string>,
        public user_second_name: Nullable<string>,
        public user_first_surname: Nullable<string>,
        public user_second_surname: Nullable<string>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>
    ) { }
}
