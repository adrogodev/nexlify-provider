export class TokenInfo {
    constructor(
        readonly jti: Nullable<string>,
        readonly ip_connection: Nullable<string>,
        readonly id_user: number,
        readonly is_admin: Nullable<boolean>
    ) { }

    static create(data: {
        jti: Nullable<string>
        ip_connection: Nullable<string>,
        id_user: number,
        is_admin: Nullable<boolean>
    }) {
        return new TokenInfo(data.jti, data.ip_connection, data.id_user, data.is_admin);
    }

    equals(other: {
        jti: Nullable<string>,
        ip_connection: Nullable<string>;
        id_user: number;
        is_admin: Nullable<boolean>
    }) {
        return (
            other.jti === this.jti,
            other.ip_connection === this.ip_connection,
            other.id_user === this.id_user,
            other.is_admin === this.is_admin
        )
    }
}