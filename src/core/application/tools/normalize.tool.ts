import { ValidationException } from "src/core/domain/exceptions";

export const normalize = <T>(value: T | null | undefined): T | undefined =>
    value === null || value === "" ? undefined : value;


export const normalizeToken = (token: string): string => {
    if (typeof token !== 'string') {
        throw new ValidationException({
            token: ['Token de asignación de credenciales inválido']
        });
    }

    const trimmedToken = token.trim();

    if (!trimmedToken.length) {
        throw new ValidationException({
            token: ['Token de asignación de credenciales inválido']
        });
    }

    try {
        const decodedToken = decodeURIComponent(trimmedToken);

        return decodedToken.replace(/ /g, '+');
    } catch {
        throw new ValidationException({
            token: ['Token de asignación de credenciales mal formado']
        });
    }
};
