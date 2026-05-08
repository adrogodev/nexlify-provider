import { createCipheriv, createDecipheriv, createHash, randomBytes, type CipherGCM, type DecipherGCM } from 'node:crypto';
import type { IEncrypter } from 'src/core/application/contracts/infrastructure';

export class EncryptHelper implements IEncrypter {
    readonly #algorithm = 'aes-256-gcm';
    readonly #authTagLength = 16;

    encrypt(str: string, key?: string): string {
        const iv = randomBytes(12);
        const secretKey = createHash('sha256').update(key ?? '').digest();
        const cipher = createCipheriv(this.#algorithm, secretKey, iv) as CipherGCM;

        let encrypted = cipher.update(str, 'utf-8', 'base64');
        encrypted += cipher.final('base64');
        const authTag = cipher.getAuthTag();

        return Buffer.concat([iv, Buffer.from(encrypted, 'base64'), authTag]).toString('base64');
    }

    decrypt(str: string, key?: string): string {
        const secretKey = createHash('sha256').update(key ?? '').digest();
        const decodedBuffer = Buffer.from(str, 'base64');

        const iv = decodedBuffer.subarray(0, 12);
        const authTag = decodedBuffer.subarray(decodedBuffer.length - this.#authTagLength);
        const encryptedData = decodedBuffer.subarray(iv.length, decodedBuffer.length - this.#authTagLength);

        const decipher = createDecipheriv(this.#algorithm, secretKey, iv) as DecipherGCM;
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData, undefined, 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}
