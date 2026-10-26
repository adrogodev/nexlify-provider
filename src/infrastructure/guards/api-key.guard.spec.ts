import { ApiKeyGuard } from './api-key.guard';
import { Request, ExecutionContext } from '@nestjs/common';
import { TokenInfo } from 'src/core/domain/models';

describe('ApiKeyGuard', () => {
    const fakeEmail = { id_email: 1n, id_client: 10n, from_email: 'a@b.com', to_email: 'c@d.com', subject: 's', state: 'QUEUED', attempts: 0 };
    const hashed = jest.fn((v: string) => `sha256:${v}`);

    const keysRepo = {
        findActiveByHashedKey: jest.fn(async (hashedKey: string) =>
            hashedKey === 'sha256:valid-key' ? { id_nexlify_key: 1n, id_client: 10n, api_key: 'sha256:valid-key', state: true } : null),
    } as never;

    const guard = new ApiKeyGuard(keysRepo, { SHA256: hashed, SHA512: jest.fn() } as never);

    const ctxFor = (headers: Record<string, string>) => {
        const request = { headers, ip: '1.1.1.1', auth_data: undefined } as unknown as Request & { auth_data?: TokenInfo };
        return {
            switchToHttp: () => ({ getRequest: () => request }),
        } as unknown as ExecutionContext;
    };

    it('accepts a valid X-API-Key and binds the owner client', async () => {
        const ctx = ctxFor({ 'x-api-key': 'valid-key' });

        await expect(guard.canActivate(ctx)).resolves.toBe(true);

        const request = ctx.switchToHttp().getRequest<{ auth_data: TokenInfo }>();
        expect(request.auth_data.id_user).toBe(10);
        expect(request.auth_data.is_admin).toBe(false);
    });

    it('denies an unknown or revoked key', async () => {
        await expect(guard.canActivate(ctxFor({ 'x-api-key': 'revoked-key' }))).rejects.toBeTruthy();
        await expect(guard.canActivate(ctxFor({}))).rejects.toBeTruthy();
    });
});
