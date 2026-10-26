import { IdGeneratorHelper } from './id-generator.helper';

describe('IdGeneratorHelper', () => {
    const helper = new IdGeneratorHelper();

    it('generates valid UUID v4 values', () => {
        const uuid = helper.generateUuid();
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(uuid).not.toBe(helper.generateUuid());
    });

    it('generates short codes with the NX- prefix and base62 characters', () => {
        const code = helper.generateShortCode();
        expect(code).toMatch(/^NX-[0-9A-Za-z]{7}$/);
        expect(code).not.toBe(helper.generateShortCode());
    });

    it('honors a custom prefix and length', () => {
        expect(helper.generateShortCode('X', 12)).toMatch(/^X-[0-9A-Za-z]{12}$/);
    });
});
