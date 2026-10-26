import bcrypt from 'bcryptjs';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { IPasswordHasher } from 'src/core/application/contracts/infrastructure';

const BCRYPT_SALT_ROUNDS = 12;
const SHA256_HEX_LENGTH = 64;

export class PasswordHasherHelper implements IPasswordHasher {

    public hash(plain: string): Promise<string> {
        return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
    }

    public async verify(plain: string, storedHash: string): Promise<boolean> {
        if (this.isBcryptHash(storedHash)) {
            return bcrypt.compare(plain, storedHash);
        }

        // Legacy unsalted SHA-256 hash: verify with constant-time comparison.
        if (typeof storedHash !== 'string' || storedHash.length !== SHA256_HEX_LENGTH) {
            return false;
        }

        const legacyHash = createHash('sha256').update(plain).digest('hex');
        return timingSafeEqual(Buffer.from(storedHash), Buffer.from(legacyHash));
    }

    public isBcryptHash(storedHash: string): boolean {
        return typeof storedHash === 'string' && /^\$2[aby]\$\d{2}\$/.test(storedHash);
    }
}
