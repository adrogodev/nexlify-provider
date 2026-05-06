import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IEncrypter } from 'src/core/application/contracts/infrastructure';

export class EncryptTools implements IEncrypter {
    private readonly _iterations = 100_000;
    private readonly _keylen = 64;
    private readonly _digest = 'sha512';

    encrypt(plain: string): string {
        const salt = randomBytes(16).toString('hex');
        const hash = pbkdf2Sync(plain, salt, this._iterations, this._keylen, this._digest).toString('hex');
        return `${salt}:${hash}`;
    }

    compare(plain: string, encrypted: string): boolean {
        const [salt, storedHash] = encrypted.split(':');
        if (!salt || !storedHash) return false;
        const hash = pbkdf2Sync(plain, salt, this._iterations, this._keylen, this._digest).toString('hex');
        try {
            return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
        } catch {
            return false;
        }
    }
}
