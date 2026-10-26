import { SignInUseCase } from './sign-in.usecase';
import { PasswordHasherHelper } from 'src/infrastructure/helpers/password-hasher.helper';
import { createHash } from 'node:crypto';

describe('SignInUseCase', () => {
    const sha = (v: string) => createHash('sha256').update(v).digest('hex');
    const hasher = new PasswordHasherHelper();
    const config = { JWT_SECRET_KEY: 'k', ENCRYPT_KEY: 'e', JWT_EXPIRATION_TIME: 1 };
    const jwt = {
        createTokenWithExpiration: jest.fn(() => 'token'),
    } as never;
    const encrypter = { encrypt: jest.fn(() => 'encrypted') } as never;

    const clientCreds = {
        id_client_credential: 1,
        id_client: 10,
        username: 'client',
        password: null,
        ip_connection: null,
        auth_token: null,
        updated_at: null,
        checked_credential_assignment_token: true,
    };

    const client = { id_client: 10n, id_client_state: 1 };

    const makeRepos = (storedPassword: string) => ({
        credsRepo: {
            findByClientByUsername: jest.fn(async () => ({ ...clientCreds, password: storedPassword })),
            update: jest.fn(async () => ({ ...clientCreds })),
        },
        clientRepo: { getByIdAsync: jest.fn(async () => ({ ...client })) },
    });

    it('accepts a legacy SHA-256 password and persists a bcrypt upgrade', async () => {
        const repos = makeRepos(sha('client-pass'));
        const useCase = new SignInUseCase(repos.credsRepo as never, repos.clientRepo as never, hasher, jwt, encrypter, config as never);

        await useCase.run({ data: { username: 'client', password: 'client-pass', ip_connection: '1.1.1.1' } as never });

        const updated = repos.credsRepo.update.mock.calls[0][1];
        expect(updated.password).toEqual(expect.stringMatching(/^\$2[aby]\$/));
    });

    it('keeps the stored password when it is already bcrypt', async () => {
        const storedBcrypt = await hasher.hash('client-pass');
        const repos = makeRepos(storedBcrypt);
        const useCase = new SignInUseCase(repos.credsRepo as never, repos.clientRepo as never, hasher, jwt, encrypter, config as never);

        await useCase.run({ data: { username: 'client', password: 'client-pass', ip_connection: '1.1.1.1' } as never });

        const updated = repos.credsRepo.update.mock.calls[0][1];
        expect(updated.password).toBe(storedBcrypt);
    });
});
