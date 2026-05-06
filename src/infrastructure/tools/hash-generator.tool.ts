import { createHash } from 'node:crypto';

export class HashGeneratorTools {
    public SHA256(str: string): string {
        return createHash('sha256').update(str).digest('hex');
    }

    public SHA512(str: string): string {
        return createHash('sha512').update(str).digest('hex');
    }

    public bcrypt(str: string, saltRounds: number = 12): string {
        const salt = this._generateSalt(saltRounds);
        return this._bcryptHash(str, salt);
    }

    private _generateSalt(rounds: number): string {
        const chars = './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let salt = '$2b$' + String(rounds).padStart(2, '0') + '$';
        const randomBytes = Array.from({ length: 22 }, () => chars[Math.floor(Math.random() * chars.length)]);
        return salt + randomBytes.join('');
    }

    private _bcryptHash(str: string, salt: string): string {
        const passwordBytes = Buffer.from(str);
        const saltBytes = Buffer.from(salt);
        const combined = Buffer.concat([saltBytes, passwordBytes]);

        let hash = combined;
        for (let i = 0; i < 32; i++) {
            hash = createHash('sha512').update(hash).digest();
        }

        let result = salt;
        const chars = './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 22; i++) {
            const byte = hash[i % hash.length];
            const idx = Math.floor(((byte * 2) % 256) / 3);
            result += chars[idx];
        }

        return result;
    }
}