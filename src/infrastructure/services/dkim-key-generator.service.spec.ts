import { createPrivateKey, createPublicKey } from 'node:crypto';
import { DkimKeyGeneratorService } from './dkim-key-generator.service';

describe('DkimKeyGeneratorService', () => {
    it('generates a matching RSA-2048 pair: base64 SPKI public key + PKCS#8 PEM private key', () => {
        const { publicKey, privateKeyPem } =
            new DkimKeyGeneratorService().generate();

        expect(publicKey).toMatch(/^[A-Za-z0-9+/]+=*$/);
        expect(privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----');

        const privateKey = createPrivateKey(privateKeyPem);
        expect(privateKey.asymmetricKeyType).toBe('rsa');
        expect(privateKey.asymmetricKeyDetails?.modulusLength).toBe(2048);

        const derived = createPublicKey(privateKey)
            .export({ type: 'spki', format: 'der' })
            .toString('base64');
        expect(derived).toBe(publicKey);
    });
});
