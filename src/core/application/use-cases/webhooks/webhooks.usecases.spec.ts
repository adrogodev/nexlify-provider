import 'reflect-metadata';
import { ListMyWebhookEndpointsUseCase } from './list-my-webhook-endpoint';
import { RegisterWebhookEndpointUseCase } from './register-webhook-endpoint';
import { UpdateWebhookEndpointUseCase } from './update-webhook-endpoint';
import { ActionNotAllowedException, NotFoundException } from 'src/core/domain/exceptions';

describe('Webhooks management use cases', () => {
    const storedEndpoints: Array<Record<string, any>> = [];

    const endpointsRepo = {
        create: jest.fn(async (data: any) => {
            // The repository/DB never receives endpoint_uuid on create: the uuid
            // comes from the database (gen_random_uuid).
            const created = {
                id_endpoint: storedEndpoints.length + 1,
                endpoint_uuid: `00000000-0000-4000-8000-00000000000${storedEndpoints.length + 1}`,
                is_active: true,
                created_at: null,
                updated_at: null,
                ...data,
            };
            storedEndpoints.push(created);
            return created;
        }),
        findByUuid: jest.fn(async (uuid: string) => storedEndpoints.find(e => e.endpoint_uuid === uuid) ?? null),
        findAllByClientId: jest.fn(async (idClient: bigint) => storedEndpoints.filter(e => e.id_client === idClient)),
        update: jest.fn(async (id: bigint, patch: any) => {
            const endpoint = storedEndpoints.find(e => e.id_endpoint === id);
            if (!endpoint) return null;
            // Prisma ignores undefined fields: the stored value is kept.
            const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
            Object.assign(endpoint, defined);
            return endpoint;
        }),
    } as never;

    const contextFor = (auth: unknown) => ({ get: jest.fn(() => auth) }) as never;
    const asRepo = () => endpointsRepo as unknown as {
        create: jest.Mock;
        findByUuid: jest.Mock;
        findAllByClientId: jest.Mock;
        update: jest.Mock;
    };

    beforeEach(() => {
        storedEndpoints.length = 0;
        jest.clearAllMocks();
    });

    describe('RegisterWebhookEndpointUseCase', () => {
        it('registers the endpoint for the calling client and returns the secret exactly once', async () => {
            const useCase = new RegisterWebhookEndpointUseCase(contextFor({ id_user: 7, is_admin: false }), endpointsRepo);

            const result = await useCase.run({ data: { url: 'https://hooks.local/receiver' } } as never);

            const createPayload = asRepo().create.mock.calls[0][0];
            expect(Object.keys(createPayload)).not.toContain('endpoint_uuid');
            expect(Object.keys(createPayload)).not.toContain('id_endpoint');
            expect(createPayload.id_client).toBe(7n);
            expect(createPayload.url).toBe('https://hooks.local/receiver');
            expect(createPayload.secret).toMatch(/^[\da-f]{64}$/);
            expect(result.secret).toBe(createPayload.secret);
            // The returned uuid comes from the repository (DB-side gen_random_uuid).
            const createdRow = storedEndpoints[0];
            expect(result.endpoint_uuid).toBe(createdRow.endpoint_uuid);
            expect(result.url).toBe('https://hooks.local/receiver');
            expect(result.is_active).toBe(true);
        });

        it('generates a fresh 32-byte secret per registration', async () => {
            const useCase = new RegisterWebhookEndpointUseCase(contextFor({ id_user: 7, is_admin: false }), endpointsRepo);

            const first = await useCase.run({ data: { url: 'https://hooks.local/receiver' } } as never);
            const second = await useCase.run({ data: { url: 'https://hooks.local/receiver' } } as never);

            expect(first.secret).toMatch(/^[\da-f]{64}$/);
            expect(second.secret).toMatch(/^[\da-f]{64}$/);
            expect(first.secret).not.toBe(second.secret);
        });

        it('binds the requested client id for an admin who passes id_client', async () => {
            const useCase = new RegisterWebhookEndpointUseCase(contextFor({ id_user: 1, is_admin: true }), endpointsRepo);

            const result = await useCase.run({ data: { url: 'https://hooks.local/receiver', id_client: 77 } } as never);

            expect(asRepo().create.mock.calls[0][0].id_client).toBe(77n);
            expect(result.id_client).toBe(77);
        });

        it('refuses a non-admin caller who requests another client', async () => {
            const useCase = new RegisterWebhookEndpointUseCase(contextFor({ id_user: 7, is_admin: false }), endpointsRepo);

            await expect(useCase.run({ data: { url: 'https://hooks.local/receiver', id_client: 77 } } as never))
                .rejects.toBeInstanceOf(ActionNotAllowedException);
            expect(asRepo().create).not.toHaveBeenCalled();
        });
    });

    describe('ListMyWebhookEndpointsUseCase', () => {
        it('lists the owned endpoints and never exposes the secret', async () => {
            storedEndpoints.push(
                { id_endpoint: 1, endpoint_uuid: 'uuid-1', id_client: 7n, url: 'https://hooks.local/a', secret: 'aaa', is_active: true, created_at: null, updated_at: null },
                { id_endpoint: 2, endpoint_uuid: 'uuid-2', id_client: 7n, url: 'https://hooks.local/b', secret: 'bbb', is_active: false, created_at: null, updated_at: null },
                { id_endpoint: 3, endpoint_uuid: 'uuid-3', id_client: 8n, url: 'https://hooks.local/c', secret: 'ccc', is_active: true, created_at: null, updated_at: null },
            );
            const useCase = new ListMyWebhookEndpointsUseCase(contextFor({ id_user: 7, is_admin: false }), endpointsRepo);

            const result = await useCase.run({ data: null } as never);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id_client: 7,
                endpoint_uuid: 'uuid-1',
                url: 'https://hooks.local/a',
                is_active: true,
                created_at: null,
                updated_at: null,
            });
            expect(Object.keys(result[0])).not.toContain('secret');
            expect(Object.keys(result[1])).not.toContain('secret');
        });
    });

    describe('UpdateWebhookEndpointUseCase', () => {
        it('updates url and is_active of the own endpoint', async () => {
            storedEndpoints.push(
                { id_endpoint: 1, endpoint_uuid: 'uuid-1', id_client: 7n, url: 'https://hooks.local/a', secret: 'aaa', is_active: true, created_at: null, updated_at: null },
            );
            const useCase = new UpdateWebhookEndpointUseCase(contextFor({ id_user: 7, is_admin: false }), endpointsRepo);

            const result = await useCase.run({
                data: { endpoint_uuid: 'uuid-1', url: 'https://hooks.local/new', is_active: false },
            } as never);

            const patch = asRepo().update.mock.calls[0][1];
            expect(Object.keys(patch)).not.toContain('endpoint_uuid');
            expect(Object.keys(patch)).not.toContain('secret');
            expect(patch).toEqual({ url: 'https://hooks.local/new', is_active: false });
            expect(result.url).toBe('https://hooks.local/new');
            expect(result.is_active).toBe(false);
            expect(Object.keys(result)).not.toContain('secret');
        });

        it('keeps the stored values when the patch omits both fields', async () => {
            storedEndpoints.push(
                { id_endpoint: 1, endpoint_uuid: 'uuid-1', id_client: 7n, url: 'https://hooks.local/a', secret: 'aaa', is_active: true, created_at: null, updated_at: null },
            );
            const useCase = new UpdateWebhookEndpointUseCase(contextFor({ id_user: 7, is_admin: false }), endpointsRepo);

            const result = await useCase.run({ data: { endpoint_uuid: 'uuid-1' } } as never);

            expect(asRepo().update.mock.calls[0][1]).toEqual({ url: undefined, is_active: undefined });
            expect(result.url).toBe('https://hooks.local/a');
            expect(result.is_active).toBe(true);
        });

        it('allows the admin to update any endpoint', async () => {
            storedEndpoints.push(
                { id_endpoint: 1, endpoint_uuid: 'uuid-1', id_client: 7n, url: 'https://hooks.local/a', secret: 'aaa', is_active: true, created_at: null, updated_at: null },
            );
            const useCase = new UpdateWebhookEndpointUseCase(contextFor({ id_user: 1, is_admin: true }), endpointsRepo);

            const result = await useCase.run({ data: { endpoint_uuid: 'uuid-1', is_active: false } } as never);

            expect(result.is_active).toBe(false);
        });

        it('refuses a non-admin caller who does not own the endpoint', async () => {
            storedEndpoints.push(
                { id_endpoint: 1, endpoint_uuid: 'uuid-1', id_client: 7n, url: 'https://hooks.local/a', secret: 'aaa', is_active: true, created_at: null, updated_at: null },
            );
            const useCase = new UpdateWebhookEndpointUseCase(contextFor({ id_user: 8, is_admin: false }), endpointsRepo);

            await expect(useCase.run({ data: { endpoint_uuid: 'uuid-1', url: 'https://hooks.local/new' } } as never))
                .rejects.toBeInstanceOf(ActionNotAllowedException);
            expect(asRepo().update).not.toHaveBeenCalled();
        });

        it('throws NotFound when the endpoint uuid is unknown', async () => {
            const useCase = new UpdateWebhookEndpointUseCase(contextFor({ id_user: 7, is_admin: false }), endpointsRepo);

            await expect(useCase.run({ data: { endpoint_uuid: 'uuid-404' } } as never))
                .rejects.toBeInstanceOf(NotFoundException);
            expect(asRepo().update).not.toHaveBeenCalled();
        });
    });
});
