export class AdminUser {
    constructor(
        readonly id_user: bigint,
        readonly name: Nullable<string>,
        readonly surname: Nullable<string>,
        readonly username: Nullable<string>,
        readonly password: Nullable<string>,
        readonly ip_connection: Nullable<string>,
        readonly auth_token: Nullable<string>,
        readonly is_active: Nullable<boolean>,
        readonly created_at: Nullable<Date>,
        readonly updated_at: Nullable<Date>
    ) { }
}
