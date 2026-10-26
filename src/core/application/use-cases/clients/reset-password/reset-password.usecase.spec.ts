import 'reflect-metadata';
import { TokenData } from 'src/core/domain/models/token-data.model';
import { ResetPasswordUseCase } from './index';
import { UnauthorizedException } from 'src/core/domain/exceptions';

const APP_CONFIG = {
    JWT_SECRET_KEY: 'jwt-secret',
    JWT_EXPIRATION_TIME: 2,
    ENCRYPT_KEY: 'encrypt-secret',
    PLATFORM_URL: 'https://platform.nexlify.com',
};

describe('ResetPasswordUseCase', () => {
    const encrypter = { encrypt: jest.fn(), decrypt: jest.fn(() => 'jwt-recovery-token') } as never;
    const jwt = { getDataToken: jest.fn() } as never;
    const hasher = { hash: jest.fn(async (plain: string) => `bcrypt:${plain}`), verify: jest.fn() } as never;

    beforeEach(() => {
        jest.clearAllMocks();
        (jwt as any).getDataToken.mockImplementation(() => TokenData.create({ isExpired: false, isNotValid: false, data: { payload: { id_user: 10 } } }));
    });

    const makeCredsRepo = (creds: unknown) => ({
        findByClientId: jest.fn(async () => creds),
        update: jest.fn(async (_id: bigint, data: any) => data),
    });

    const run = async (credsRepo: any, data: { recovery_token: string; password: string }) => {
        const useCase = new ResetPasswordUseCase(encrypter, jwt, hasher, credsRepo as never, APP_CONFIG as never);
        return await useCase.run({ data } as never);
    };

    it('hashes the new password, clears the recovery token and persists the credentials', async () => {
        const creds = { id_client_credential: 3n, id_client: 10n, recovery_token: 'encrypted-recovery-token', password: 'old' };
        const credsRepo = makeCredsRepo(creds);

        const result = await run(credsRepo, { recovery_token: 'encrypted-recovery-token', password: 'nueva-clave' });

        expect((encrypter as any).decrypt).toHaveBeenCalledWith('encrypted-recovery-token', APP_CONFIG.ENCRYPT_KEY);
        expect((jwt as any).getDataToken).toHaveBeenCalledWith('jwt-recovery-token', APP_CONFIG.JWT_SECRET_KEY);
        expect((hasher as any).hash).toHaveBeenCalledWith('nueva-clave');
        const persisted = credsRepo.update.mock.calls[0][1];
        expect(persisted.password).toBe('bcrypt:nueva-clave');
        expect(persisted.recovery_token).toBeNull();
        expect(result).toBe(true);
    });

    it('rejects with Unauthorized when the embedded JWT is invalid or expired', async () => {
        (jwt as any).getDataToken.mockImplementationOnce(() => TokenData.create({ isExpired: true, isNotValid: true, data: null }));
        const credsRepo = makeCredsRepo({});

        await expect(run(credsRepo, { recovery_token: 'x', password: 'nueva-clave' })).rejects.toBeInstanceOf(UnauthorizedException);

        expect((hasher as any).hash).not.toHaveBeenCalled();
        expect(credsRepo.update).not.toHaveBeenCalled();
    });

    it('rejects and keeps credentials intact when the token was already used', async () => {
        const creds = { id_client_credential: 3n, id_client: 10n, recovery_token: null, password: 'old' };
        const credsRepo = makeCredsRepo(creds);

        await expect(run(credsRepo, { recovery_token: 'encrypted-recovery-token', password: 'nueva-clave' })).rejects.toBeInstanceOf(UnauthorizedException);

        expect(credsRepo.update).not.toHaveBeenCalled();
        // The stored password still unchanged proves no partial persistence happened.
        expect(creds.password).toBe('old');
    });

    it('rejects with Unauthorized when there are no credentials for the token identity', async () => {
        const credsRepo = makeCredsRepo(null);

        await expect(run(credsRepo, { recovery_token: 'x', password: 'nueva-clave' })).rejects.toBeInstanceOf(UnauthorizedException);

        expect(credsRepo.update).not.toHaveBeenCalled();
    });
});
