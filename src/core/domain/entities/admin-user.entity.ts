export class AdminUser {
    constructor(
        public id_user: bigint,
        public name: Nullable<string>,
        public surname: Nullable<string>,
        public username: Nullable<string>,
        public password: Nullable<string>,
        public ip_connection: Nullable<string>,
        public auth_token: Nullable<string>,
        public is_active: Nullable<boolean>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>
    ) { }
}
