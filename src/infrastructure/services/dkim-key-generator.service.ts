import { generateKeyPairSync } from 'node:crypto';
import type {
    DkimKeyPair,
    IDkimKeyGenerator,
} from 'src/core/application/contracts/services';

/** RSA-2048 DKIM keypairs through node:crypto (S4). */
export class DkimKeyGeneratorService implements IDkimKeyGenerator {
    public generate = (): DkimKeyPair => {
        const { publicKey, privateKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'der' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        return {
            publicKey: publicKey.toString('base64'),
            privateKeyPem: privateKey,
        };
    };
}
