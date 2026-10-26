import 'reflect-metadata';
import { UpdateClientUseCase } from './index';
import { ActionNotAllowedException, NotFoundException } from 'src/core/domain/exceptions';

describe('UpdateClientUseCase', () => {
    const contextFor = (auth: unknown) => ({ get: jest.fn(() => auth) }) as never;

    const makeClientRepo = (client: unknown) => ({
        getByIdAsync: jest.fn(async () => client),
        update: jest.fn(async (_id: bigint, data: any) => (client as any)),
    });

    it('updates the contact fields of the caller client when the caller is not admin', async () => {
        const clientRepo = makeClientRepo({ id_client: 10n });
        const useCase = new UpdateClientUseCase(contextFor({ id_user: 10, is_admin: false }), clientRepo as never);

        const result = await useCase.run({ data: { email: 'nuevo@n.com', cell_callsign: '099', cell_phone: '123456', user_first_name: 'Ana' } as never });

        expect((clientRepo as any).update).toHaveBeenCalledWith(10n, expect.objectContaining({ email: 'nuevo@n.com' }));
        expect((clientRepo as any).update.mock.calls[0][1]).not.toHaveProperty('id_client');
        expect(result).toBe(true);
    });

    it('allows an admin to update any client by the id_client sent in the body', async () => {
        const clientRepo = makeClientRepo({ id_client: 77n });
        const useCase = new UpdateClientUseCase(contextFor({ id_user: 1, is_admin: true }), clientRepo as never);

        await useCase.run({ data: { id_client: 77, email: 'nuevo@n.com' } as never });

        expect((clientRepo as any).update).toHaveBeenCalledWith(77n, expect.objectContaining({ email: 'nuevo@n.com' }));
    });

    it('refuses a non-admin that sends another id_client', async () => {
        const clientRepo = makeClientRepo({ id_client: 10n });
        const useCase = new UpdateClientUseCase(contextFor({ id_user: 10, is_admin: false }), clientRepo as never);

        await expect(useCase.run({ data: { id_client: 77, email: 'nuevo@n.com' } as never })).rejects.toBeInstanceOf(ActionNotAllowedException);
        expect((clientRepo as any).update).not.toHaveBeenCalled();
    });

    it('throws NotFound when the client does not exist', async () => {
        const clientRepo = makeClientRepo(null);
        const useCase = new UpdateClientUseCase(contextFor({ id_user: 10, is_admin: false }), clientRepo as never);

        await expect(useCase.run({ data: { email: 'nuevo@n.com' } as never })).rejects.toBeInstanceOf(NotFoundException);
        expect((clientRepo as any).update).not.toHaveBeenCalled();
    });
});
