export class TokenInfo {
    constructor(
        readonly ip_connection: string,
        readonly id_user: number
    ) { }

    static create(data: {
        ip_connection: string,
        id_user: number
    }) {
        return new TokenInfo(data.ip_connection, data.id_user);
    }

    equals(other: {
        ip_connection: string;
        id_user: number;
    }) {
        return (
            other.ip_connection === this.ip_connection,
            other.id_user === this.id_user
        )
    }
}