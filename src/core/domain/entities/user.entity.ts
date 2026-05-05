export class User {
    constructor(
        readonly id?: bigint,
        readonly idClient?: bigint,
        readonly firstName?: string,
        readonly secondName?: string,
        readonly firstSurname?: string,
        readonly secondSurname?: string,
        readonly email?: string,
        readonly cellCallsign?: string,
        readonly cellPhone?: string,
        readonly birthdate?: Date,
        readonly state?: boolean,
        readonly createdAt?: Date,
        readonly updatedAt?: Date,
    ) { }
}
