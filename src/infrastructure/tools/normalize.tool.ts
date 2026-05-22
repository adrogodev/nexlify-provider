import { ValidationException } from "src/core/domain/exceptions";

export const normalize = <T>(value: T | null | undefined): T | undefined =>
    value === null || value === "" ? undefined : value;


export const normalizeToken = (token: string): string => {
    if (typeof token !== 'string' || token.trim().length === 0) {
        throw new ValidationException({ token: ['Token de asignación de credeciales invalido'] })
    }

    return token.replace(/ /g, '+');
}