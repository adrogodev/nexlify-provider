export class TokenInfo {
    constructor(
        readonly jti: Nullable<string>,
        readonly ip_connection: Nullable<string>,
        readonly id_user: number
    ) { }

    static create(data: {
        jti: Nullable<string>
        ip_connection: Nullable<string>,
        id_user: number
    }) {
        return new TokenInfo(data.jti, data.ip_connection, data.id_user);
    }

    equals(other: {
        jti: Nullable<string>,
        ip_connection: Nullable<string>;
        id_user: number;
    }) {
        return (
            other.jti === this.jti,
            other.ip_connection === this.ip_connection,
            other.id_user === this.id_user
        )
    }
}