import { createHash } from 'node:crypto';
import type { IHashGenerator } from 'src/core/application/contracts/infrastructure';

export class HashGeneratorHelper implements IHashGenerator {
    public SHA256(str: string): string {
        return createHash('sha256').update(str).digest('hex');
    }

    public SHA512(str: string): string {
        return createHash('sha512').update(str).digest('hex');
    }
}