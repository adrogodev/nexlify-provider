import { createHmac } from 'node:crypto';

describe('InboundWebhookSecurityService', () => {
    const SECRET = 'fixture-inbound-secret';
    const rawBody = JSON.stringify({ sender: 'reply@test.local', message_id: '<reply@test.local>' });

    const originalSecret = process.env['INBOUND_WEBHOOK_SECRET'];
    const originalNodeEnv = process.env['NODE_ENV'];
    const expected = (): string =>
        createHmac('sha256', process.env['INBOUND_WEBHOOK_SECRET'] as string).update(rawBody).digest('hex');

    beforeEach(async () => {
        // The service reads the secret from AppEnvs (required env, evaluated at
        // module load): point the env keys at the fixture values and re-import
        // the module fresh so the AppEnvs freeze sees them. jest sets NODE_ENV=test
        // by default, which the app config rejects; restore the app's enum value.
        process.env['INBOUND_WEBHOOK_SECRET'] = SECRET;
        process.env['NODE_ENV'] = 'development';
        jest.resetModules();
    });

    afterAll(() => {
        if (originalSecret === undefined) {
            delete process.env['INBOUND_WEBHOOK_SECRET'];
        } else {
            process.env['INBOUND_WEBHOOK_SECRET'] = originalSecret;
        }
        if (originalNodeEnv === undefined) {
            delete process.env['NODE_ENV'];
        } else {
            process.env['NODE_ENV'] = originalNodeEnv;
        }
        jest.resetModules();
    });

    const loadService = async (): Promise<InstanceType<(typeof import('./inbound-webhook.security'))['InboundWebhookSecurityService']>> => {
        const mod = await import('./inbound-webhook.security');
        return new mod.InboundWebhookSecurityService();
    };

    it('accepts a request whose signature is the HMAC-SHA256 hex of the exact raw body', async () => {
        const service = await loadService();

        expect(service.verify(rawBody, expected())).toBe(true);
    });

    it('signs raw bodies exactly as the documented hex HMAC-SHA256 scheme', async () => {
        const service = await loadService();

        expect(service.sign(rawBody)).toBe(expected());
    });

    it('verifies against another raw body with the same secret', async () => {
        const service = await loadService();
        const otherBody = JSON.stringify({ sender: 'other@test.local' });

        expect(service.verify(otherBody, service.sign(otherBody))).toBe(true);
    });

    it('rejects a signature computed for a different body (tampered payload)', async () => {
        const service = await loadService();
        const tamperedSignature = createHmac('sha256', SECRET)
            .update(JSON.stringify({ sender: 'evil@test.local' }))
            .digest('hex');

        expect(service.verify(rawBody, tamperedSignature)).toBe(false);
    });

    it('rejects a tampered raw body signed with a different secret', async () => {
        const service = await loadService();
        const foreign = createHmac('sha256', 'not-the-secret').update(rawBody).digest('hex');

        expect(service.verify(rawBody, foreign)).toBe(false);
    });

    it('rejects a missing signature header without throwing', async () => {
        const service = await loadService();

        expect(service.verify(rawBody, undefined)).toBe(false);
    });

    it('rejects malformed or wrong-length signature headers without throwing', async () => {
        const service = await loadService();

        expect(service.verify(rawBody, '')).toBe(false);
        expect(service.verify(rawBody, 'not-hex-signature')).toBe(false);
        expect(service.verify(rawBody, 'deadbeef')).toBe(false);
        expect(service.verify(rawBody, `${expected()}ff`)).toBe(false);
    });
});
