import { TokenData } from "src/core/domain/models/token-data.model";

export const JWT_GENERATOR = Symbol('IJwtGenerator');

export interface JWTPayload<T> {
    payload: T,
    check: boolean,
    date: string
}

export interface IJwtGenerator {

    createToken<T>(options: { data: T, key: string, expiresIn }): string;

    getDataToken<T>(token: string, key: string): TokenData<Nullable<JWTPayload<T>>>;
}