import { createHash } from 'node:crypto';
import { PasswordHasherHelper } from './password-hasher.helper';

describe('PasswordHasherHelper', () => {
    const helper = new PasswordHasherHelper();
    const plain = 's3cure-Pass!';

    it('hashes with bcrypt and verifies correctly', async () => {
        const stored = await helper.hash(plain);
        expect(helper.isBcryptHash(stored)).toBe(true);
        expect(await helper.verify(plain, stored)).toBe(true);
        expect(await helper.verify('wrong', stored)).toBe(false);
    });

    it('verifies legacy unsalted SHA-256 hashes for backwards compatibility', async () => {
        const legacyStored = createHash('sha256').update(plain).digest('hex');
        expect(helper.isBcryptHash(legacyStored)).toBe(false);
        expect(await helper.verify(plain, legacyStored)).toBe(true);
        expect(await helper.verify('wrong', legacyStored)).toBe(false);
    });

    it('rejects stored hashes that are neither bcrypt nor SHA-256 hex', async () => {
        expect(await helper.verify(plain, 'no-es-un-hash')).toBe(false);
        expect(await helper.verify(plain, '')).toBe(false);
    });
});
