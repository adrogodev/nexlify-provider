export const ENCRYPTER = Symbol('IEncrypter');

export interface IEncrypter {
    encrypt(str: string, key?: string): string;
    decrypt(str: string, key?: string): string;
}