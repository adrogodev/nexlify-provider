export class ClientCredentials {
    constructor(
        public id_client_credential: bigint,
        public id_client: Nullable<bigint>,
        public username: Nullable<string>,
        public password: Nullable<string>,
        public ip_connection: Nullable<string>,
        public assign_credentials_token_jti: Nullable<string>,
        public checked_credential_assignment_token: Nullable<boolean>,
        public auth_token: Nullable<string>,
        public recovery_token: Nullable<string>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>,
    ) { }
}