export const HASH_GENERATOR = Symbol('IHashGenerator');

export interface IHashGenerator {
    SHA256(str: string): string;
}