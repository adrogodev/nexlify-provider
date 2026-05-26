export class TokenInfo {
    constructor(
        readonly jti: Nullable<string>,
        readonly ip_connection: Nullable<string>,
        readonly id_user: number,
        readonly admin: Nullable<boolean>
    ) { }

    static create(data: {
        jti: Nullable<string>
        ip_connection: Nullable<string>,
        id_user: number,
        admin: Nullable<boolean>
    }) {
        return new TokenInfo(data.jti, data.ip_connection, data.id_user, data.admin);
    }

    equals(other: {
        jti: Nullable<string>,
        ip_connection: Nullable<string>;
        id_user: number;
        admin: Nullable<boolean>
    }) {
        return (
            other.jti === this.jti,
            other.ip_connection === this.ip_connection,
            other.id_user === this.id_user,
            other.admin === this.admin
        )
    }
}