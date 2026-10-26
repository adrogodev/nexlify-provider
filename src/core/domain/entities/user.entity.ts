export class User {
    constructor(
        public id_user: bigint,
        public id_client: Nullable<bigint>,
        public id_type: Nullable<number>,
        public id_number: Nullable<string>,
        public first_name: Nullable<string>,
        public second_name: Nullable<string>,
        public first_surname: Nullable<string>,
        public second_surname: Nullable<string>,
        public email: Nullable<string>,
        public cell_callsign: Nullable<string>,
        public cell_phone: Nullable<string>,
        public birthdate: Nullable<Date>,
        public state: Nullable<boolean>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>
    ) { }
}
