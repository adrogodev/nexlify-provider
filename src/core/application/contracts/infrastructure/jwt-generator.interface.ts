import { TokenData } from "src/core/domain/models/token-data.model";

export const JWT_GENERATOR = Symbol('IJwtGenerator');

export interface JWTPayload<T> {
    payload: T,
    check: boolean,
    date: string
}

export interface IJwtGenerator {

    createTokenWithExpiration<T>(options: { data: T, key: string, expiresIn: string }): string;

    getDataToken<T>(token: string, key: string): TokenData<Nullable<JWTPayload<T>>>;
}