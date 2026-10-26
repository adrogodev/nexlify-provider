import 'reflect-metadata';
import { UpdateClientStateUseCase } from './index';
import { ActionNotAllowedException, NotFoundException } from 'src/core/domain/exceptions';

describe('UpdateClientStateUseCase', () => {
    const contextFor = (auth: unknown) => ({ get: jest.fn(() => auth) }) as never;

    const makeClientRepo = (client: unknown) => ({
        getByIdAsync: jest.fn(async () => client),
        update: jest.fn(async (_id: bigint, data: any) => (client as any)),
    });

    it('changes the client state for an admin', async () => {
        const clientRepo = makeClientRepo({ id_client: 10n });
        const useCase = new UpdateClientStateUseCase(contextFor({ id_user: 1, is_admin: true }), clientRepo as never);

        const result = await useCase.run({ data: { id_client: 10, id_client_state: 2 } as never });

        expect((clientRepo as any).update).toHaveBeenCalledWith(10n, { id_client_state: 2 });
        expect(result).toBe(true);
    });

    it('refuses a non-admin caller', async () => {
        const clientRepo = makeClientRepo({ id_client: 10n });
        const useCase = new UpdateClientStateUseCase(contextFor({ id_user: 10, is_admin: false }), clientRepo as never);

        await expect(useCase.run({ data: { id_client: 10, id_client_state: 2 } } as never)).rejects.toBeInstanceOf(ActionNotAllowedException);
        expect((clientRepo as any).update).not.toHaveBeenCalled();
    });

    it('throws NotFound when the client does not exist', async () => {
        const clientRepo = makeClientRepo(null);
        const useCase = new UpdateClientStateUseCase(contextFor({ id_user: 1, is_admin: true }), clientRepo as never);

        await expect(useCase.run({ data: { id_client: 999, id_client_state: 2 } } as never)).rejects.toBeInstanceOf(NotFoundException);
        expect((clientRepo as any).update).not.toHaveBeenCalled();
    });
});
