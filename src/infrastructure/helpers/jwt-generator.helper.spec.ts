import { JwtGeneratorHelper } from './jwt-generator.helper';

describe('JwtGeneratorHelper', () => {
    let helper: JwtGeneratorHelper;

    beforeEach(() => {
        helper = new JwtGeneratorHelper();
    });

    it('signs a token with expiration using the provided key', () => {
        const token = helper.createTokenWithExpiration({
            data: { id_user: 1 },
            key: 'unit-test-secret',
            expiresIn: '1h',
        });

        expect(typeof token).toBe('string');
        const decoded = helper.getDataToken<{ id_user: number }>(token, 'unit-test-secret');
        expect(decoded.isNotValid).toBe(false);
        expect(decoded.data!.payload.id_user).toBe(1);
    });

    it('signs a token without expiration using the provided key', () => {
        const token = helper.createTokenWithoutExpiration({
            data: { id_user: 2 },
            key: 'unit-test-secret',
        });

        const decoded = helper.getDataToken<{ id_user: number }>(token, 'unit-test-secret');
        expect(decoded.isNotValid).toBe(false);
        expect(decoded.data!.payload.id_user).toBe(2);
    });

    it('throws when the signing key is empty instead of falling back to a hardcoded key', () => {
        expect(() =>
            helper.createTokenWithExpiration({ data: {}, key: '', expiresIn: '1h' })
        ).toThrow(/key/i);
        expect(() =>
            helper.createTokenWithoutExpiration({ data: {}, key: '' })
        ).toThrow(/key/i);
    });

    it('throws when verifying with an empty key', () => {
        const token = helper.createTokenWithExpiration({
            data: {},
            key: 'unit-test-secret',
            expiresIn: '1h',
        });

        expect(() => helper.getDataToken(token, '')).toThrow(/key/i);
    });
});
