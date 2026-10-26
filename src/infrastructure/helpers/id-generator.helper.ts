import { randomUUID } from 'node:crypto';
import type { IIdGenerator } from 'src/core/application/contracts/infrastructure';

const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const DEFAULT_PREFIX = 'NX';
const DEFAULT_LENGTH = 7;

export class IdGeneratorHelper implements IIdGenerator {

    public generateUuid(): string {
        return randomUUID();
    }

    public generateShortCode(prefix: string = DEFAULT_PREFIX, length: number = DEFAULT_LENGTH): string {
        let code = '';
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        for (const byte of bytes) {
            code += BASE62_ALPHABET[byte % BASE62_ALPHABET.length];
        }
        return `${prefix}-${code}`;
    }
}
