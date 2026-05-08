export class AdmiUser {
    constructor(
        readonly id?: bigint,
        readonly name?: string,
        readonly surname?: string,
        readonly username?: string,
        readonly password?: string,
        readonly ipConnection?: string,
        readonly authToken?: string,
        readonly recoveryTokenData?: string,
        readonly isActive?: boolean,
        readonly createdAt?: Date,
        readonly updatedAt?: Date,
    ) { }
}