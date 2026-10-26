export const PASSWORD_HASHER = Symbol('IPasswordHasher');

export interface IPasswordHasher {

    hash(plain: string): Promise<string>;

    /**
     * Verifies a plain value against a stored hash.
     * Supports legacy unsalted SHA-256 hashes for backwards compatibility.
     */
    verify(plain: string, storedHash: string): Promise<boolean>;

    /** Returns true when the stored hash was produced with bcrypt. */
    isBcryptHash(storedHash: string): boolean;
}
