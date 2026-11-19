import { AssignCredentialsUseCase } from './assign-credentials.usecase';

describe('AssignCredentialsUseCase API key', () => {
    it('mints the client API key from the CSPRNG generator, never from the client id and a timestamp', async () => {
        const client = { id_client: 5n, id_client_state: null };
        const credentials = {
            id_client_credential: 1n,
            checked_credential_assignment_token: true,
        };
        const keysRepo = { create: jest.fn(async (data: unknown) => data) };
        const keysLogRepo = { create: jest.fn(async (data: unknown) => data) };
        const hash = { SHA256: jest.fn((value: string) => `sha256:${value}`) };
        const idGenerator = {
            generateApiKey: jest.fn(() => 'nxk_RandomKeyFromCsprng'),
        };

        const useCase = new AssignCredentialsUseCase(
            {
                getByIdAsync: jest.fn(async () => client),
                update: jest.fn(async () => client),
            } as never,
            {
                findByClientId: jest.fn(async () => credentials),
                update: jest.fn(async () => credentials),
            } as never,
            keysRepo as never,
            keysLogRepo as never,
            {
                getDataToken: jest.fn(() => ({
                    data: { payload: { id_user: 5 } },
                })),
            } as never,
            { decrypt: jest.fn(() => 'decrypted-jwt') } as never,
            hash as never,
            { hash: jest.fn(async () => 'bcrypt-hash') } as never,
            { ENCRYPT_KEY: 'k', JWT_SECRET_KEY: 's' } as never,
            idGenerator as never,
        );

        await useCase.run({
            data: {
                assign_creds_token: 'token',
                username: 'cliente',
                password: 'Secreta123*',
            },
        } as never);

        expect(idGenerator.generateApiKey).toHaveBeenCalledTimes(1);
        expect(keysRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                api_key: 'sha256:nxk_RandomKeyFromCsprng',
                id_client: 5n,
                state: true,
            }),
        );
        expect(keysLogRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                api_key: 'sha256:nxk_RandomKeyFromCsprng',
            }),
        );
        expect(hash.SHA256).not.toHaveBeenCalledWith(
            expect.stringContaining('NexlifyApiKey'),
        );
    });
});
