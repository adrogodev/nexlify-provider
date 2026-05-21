export class ClientCredentials {
    constructor(
        readonly id_client_credential: bigint,
        readonly id_client: Nullable<bigint>,
        readonly username: Nullable<string>,
        readonly password: Nullable<string>,
        readonly ip_connection: Nullable<string>,
        readonly assign_credentials_token_jti: Nullable<string>,
        readonly auth_token: Nullable<string>,
        readonly recovery_token: Nullable<string>,
        readonly created_at: Nullable<Date>,
        readonly updated_at: Nullable<Date>
    ) { }
}