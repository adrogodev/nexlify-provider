import { allowedOrigins, buildCorsOptions } from './cors-options';

describe('CORS allow-list', () => {
    const decide = (origins: string[], origin: string | undefined) =>
        new Promise<boolean | undefined>((resolve, reject) => {
            const options = buildCorsOptions(origins);
            const check = options.origin as (
                requestOrigin: string | undefined,
                callback: (err: Error | null, allow?: boolean) => void,
            ) => void;
            check(origin, (err, allow) => (err ? reject(err) : resolve(allow)));
        });

    it('allows the origin of PLATFORM_URL even when it carries a path', () => {
        expect(allowedOrigins('https://app.example.com/portal', '')).toEqual([
            'https://app.example.com',
        ]);
    });

    it('adds the extra CORS_ORIGINS, trimmed, normalized and without duplicates', () => {
        expect(
            allowedOrigins(
                'https://app.example.com/portal',
                ' https://admin.example.com/ , https://app.example.com ,,',
            ),
        ).toEqual(['https://app.example.com', 'https://admin.example.com']);
    });

    it('accepts a browser request from an allowed origin', async () => {
        await expect(
            decide(['https://app.example.com'], 'https://app.example.com'),
        ).resolves.toBe(true);
    });

    it('rejects a browser request from any other origin', async () => {
        await expect(
            decide(['https://app.example.com'], 'https://evil.example.net'),
        ).resolves.toBe(false);
    });

    it('accepts requests without Origin (server-to-server API key clients, curl)', async () => {
        await expect(
            decide(['https://app.example.com'], undefined),
        ).resolves.toBe(true);
    });
});
