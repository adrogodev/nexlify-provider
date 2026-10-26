export const ID_GENERATOR = Symbol('IIdGenerator');

export interface IIdGenerator {

    /** Generates a cryptographically random UUID v4. */
    generateUuid(): string;

    /** Generates a short human-friendly code, e.g. NX-7K3F9A1. */
    generateShortCode(prefix?: string, length?: number): string;
}
