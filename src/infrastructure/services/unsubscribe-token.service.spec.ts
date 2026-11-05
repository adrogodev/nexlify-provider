import { UnsubscribeTokenService } from './unsubscribe-token.service';

describe('UnsubscribeTokenService', () => {
    const service = new UnsubscribeTokenService(
        'encrypt-key',
        'https://api.nexlify.test/',
    );

    it('round-trips email and client through a compact url-safe token', () => {
        const token = service.sign({ email: 'Dest@Test.local', id_client: 7n });

        expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
        expect(service.verify(token)).toEqual({
            email: 'dest@test.local',
            id_client: 7n,
        });
    });

    it('supports emails sent without a client', () => {
        expect(
            service.verify(
                service.sign({ email: 'a@test.local', id_client: null }),
            ),
        ).toEqual({ email: 'a@test.local', id_client: null });
    });

    it('rejects tampered payloads, foreign signatures and garbage', () => {
        const token = service.sign({ email: 'a@test.local', id_client: 7n });
        const [, signature] = token.split('.');
        const forgedPayload = Buffer.from(
            JSON.stringify({ e: 'a@test.local', c: '8' }),
        ).toString('base64url');
        const other = new UnsubscribeTokenService('another-key', 'http://x');

        expect(service.verify(`${forgedPayload}.${signature}`)).toBeNull();
        expect(
            service.verify(
                other.sign({ email: 'a@test.local', id_client: 7n }),
            ),
        ).toBeNull();
        expect(service.verify('not-a-token')).toBeNull();
        expect(service.verify('')).toBeNull();
        expect(
            service.verify(
                `${Buffer.from('{bad json').toString('base64url')}.${signature}`,
            ),
        ).toBeNull();
    });

    it('builds the public unsubscribe url without a double slash', () => {
        const url = service.buildUrl({
            email: 'a@test.local',
            id_client: null,
        });

        expect(
            url.startsWith('https://api.nexlify.test/api/unsubscribe/'),
        ).toBe(true);
        const token = url.split('/').pop() as string;
        expect(service.verify(token)).toEqual({
            email: 'a@test.local',
            id_client: null,
        });
    });
});
