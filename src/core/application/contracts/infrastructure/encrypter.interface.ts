export const ENCRYPTER = Symbol('IEncrypter');

export interface IEncrypter {
    encrypt(plain: string): string;
    compare(plain: string, encrypted: string): boolean;
}