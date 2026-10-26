import { AuthAdminUserUseCase } from './auth-admin-user.usecase';
import { PasswordHasherHelper } from 'src/infrastructure/helpers/password-hasher.helper';
import { createHash } from 'node:crypto';
import { UnauthorizedException } from 'src/core/domain/exceptions';

describe('AuthAdminUserUseCase', () => {
    const sha = (v: string) => createHash('sha256').update(v).digest('hex');
    const config = { JWT_SECRET_KEY: 'k', ENCRYPT_KEY: 'e', JWT_EXPIRATION_TIME: 1 };
    const jwt = {
        createTokenWithExpiration: jest.fn(() => 'token'),
    } as never;
    const encrypter = { encrypt: jest.fn(() => 'encrypted') } as never;
    const hasher = new PasswordHasherHelper();

    const user = {
        id_user: 1n,
        username: 'admin',
        password: null,
        is_active: true,
        ip_connection: null,
        auth_token: null,
        updated_at: null,
    };

    const makeRepo = (storedPassword: string) => ({
        findByUsername: jest.fn(async () => ({ ...user, password: storedPassword })),
        update: jest.fn(async () => user),
    });

    it('authenticates with a legacy SHA-256 hash and upgrades it to bcrypt', async () => {
        const repo = makeRepo(sha('admin-pass'));
        const useCase = new AuthAdminUserUseCase(repo as never, hasher, jwt, encrypter, config as never);

        await useCase.run({ data: { username: 'admin', password: 'admin-pass', ip_connection: '1.1.1.1' } as never });

        expect(repo.update).toHaveBeenCalledTimes(1);
    });

    it('updates the stored password to bcrypt after a successful legacy login', async () => {
        const repo = makeRepo(sha('admin-pass'));
        const useCase = new AuthAdminUserUseCase(repo as never, hasher, jwt, encrypter, config as never);

        await useCase.run({ data: { username: 'admin', password: 'admin-pass', ip_connection: '1.1.1.1' } as never });

        const updated = repo.update.mock.calls[0][1];
        expect(updated.password).toEqual(expect.stringMatching(/^\$2[aby]\$/));
    });

    it('authenticates against a bcrypt hash without rehashing', async () => {
        const storedBcrypt = await hasher.hash('admin-pass');
        const repo = makeRepo(storedBcrypt);
        const useCase = new AuthAdminUserUseCase(repo as never, hasher, jwt, encrypter, config as never);

        await useCase.run({ data: { username: 'admin', password: 'admin-pass', ip_connection: '1.1.1.1' } as never });

        const updated = repo.update.mock.calls[0][1];
        expect(updated.password).toBe(storedBcrypt);
    });

    it('rejects a wrong password for a legacy hash', async () => {
        const repo = makeRepo(sha('admin-pass'));
        const useCase = new AuthAdminUserUseCase(repo as never, hasher, jwt, encrypter, config as never);

        await expect(
            useCase.run({ data: { username: 'admin', password: 'wrong', ip_connection: '1.1.1.1' } as never })
        ).rejects.toThrow(UnauthorizedException);
    });
});
