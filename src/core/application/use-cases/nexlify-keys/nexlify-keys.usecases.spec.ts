import { GenerateNexlifyKeyUseCase } from './generate-nexlify-key.usecase';
import { ListMyNexlifyKeysUseCase } from './list-my-nexlify-keys.usecase';
import { RevokeNexlifyKeyUseCase } from './revoke-nexlify-key.usecase';
import { ActionNotAllowedException, NotFoundException } from 'src/core/domain/exceptions';

describe('API key management use cases', () => {
    const hashGenerator = { SHA256: jest.fn((v: string) => `sha256:${v}`), SHA512: jest.fn() } as never;

    const contextFor = (auth: unknown) => ({ get: jest.fn(() => auth) }) as never;

    const allKeys: Array<Record<string, any>> = [];
    const keysRepo = {
        findActiveByClientId: jest.fn(async (id: bigint) => allKeys.filter(k => k.id_client === id && k.state)),
        deactivateAllByClientId: jest.fn(async (id: bigint) => {
            allKeys.filter(k => k.id_client === id && k.state).forEach(k => { k.state = false; });
            return 1;
        }),
        create: jest.fn(async (data: any) => {
            const created = { id_nexlify_key: 3n, ...data };
            allKeys.push(created);
            return created;
        }),
        getByIdAsync: jest.fn(async (id: bigint) => allKeys.find(k => k.id_nexlify_key === id) ?? null),
        delete: jest.fn(async (id: bigint) => {
            const index = allKeys.findIndex(k => k.id_nexlify_key === id);
            if (index === -1) return false;
            allKeys.splice(index, 1);
            return true;
        }),
    } as never;

    beforeEach(() => {
        allKeys.length = 0;
        jest.clearAllMocks();
    });

    describe('GenerateNexlifyKeyUseCase', () => {
        it('generates a raw key for the calling client and revokes previous active ones', async () => {
            allKeys.push({ id_nexlify_key: 7n, id_client: 10n, api_key: 'old', state: true });
            const useCase = new GenerateNexlifyKeyUseCase(contextFor({ id_user: 10, is_admin: false }), keysRepo, hashGenerator);

            const result = await useCase.run({ data: null } as never);

            expect(result.api_key).toContain('NexlifyApiKey');
            expect((keysRepo as any).deactivateAllByClientId).toHaveBeenCalledWith(10n);
            expect((keysRepo as any).create.mock.calls[0][0].state).toBe(true);
            expect((keysRepo as any).create.mock.calls[0][0].api_key).toBe(`sha256:${result.api_key}`);
        });

        it('refuses non-admin requests targeting another client', async () => {
            const useCase = new GenerateNexlifyKeyUseCase(contextFor({ id_user: 10, is_admin: false }), keysRepo as never, hashGenerator);
            await expect(useCase.run({ data: { id_client: 55n } } as never)).rejects.toBeInstanceOf(ActionNotAllowedException);
        });

        it('allows admin requests targeting another client', async () => {
            const useCase = new GenerateNexlifyKeyUseCase(contextFor({ id_user: 1, is_admin: true }), keysRepo as never, hashGenerator);
            const result = await useCase.run({ data: { id_client: 55n } } as never);
            expect(result.api_key).toBeTruthy();
        });
    });

    describe('ListMyNexlifyKeysUseCase', () => {
        it('lists masked keys of the calling client (raw hash never returned)', async () => {
            allKeys.push({ id_nexlify_key: 1n, id_client: 10n, api_key: 'sha256:secret', state: true, created_at: new Date() });
            const useCase = new ListMyNexlifyKeysUseCase(contextFor({ id_user: 10, is_admin: false }), keysRepo as never);

            const items = await useCase.run({ data: null } as never);

            expect(items[0].api_key_masked).toBe('sha2\u2026cret');
            expect((items[0] as Record<string, unknown>).api_key).toBeUndefined();
            expect(items[0].id_client).toBe(10);
        });
    });

    describe('RevokeNexlifyKeyUseCase', () => {
        it('deletes the key owned by the calling client', async () => {
            allKeys.push({ id_nexlify_key: 1n, id_client: 10n, api_key: 'k', state: true });
            const useCase = new RevokeNexlifyKeyUseCase(contextFor({ id_user: 10, is_admin: false }), keysRepo as never);

            const result = await useCase.run({ data: 1n } as never);

            expect(result).toBe(true);
            expect(allKeys).toHaveLength(0);
        });

        it('throws NotFound for a foreign key when the caller is a client', async () => {
            allKeys.push({ id_nexlify_key: 9n, id_client: 77n, api_key: 'k', state: true });
            const useCase = new RevokeNexlifyKeyUseCase(contextFor({ id_user: 10, is_admin: false }), keysRepo as never);
            await expect(useCase.run({ data: 9n } as never)).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});

