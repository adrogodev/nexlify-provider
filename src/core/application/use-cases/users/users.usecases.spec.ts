import 'reflect-metadata';
import { CreateUserUseCase } from './create-user';
import { GetUsersUseCase } from './get-users';
import { UpdateUserUseCase } from './update-user';
import { ActionNotAllowedException, NotFoundException } from 'src/core/domain/exceptions';

describe('Users CRUD use cases', () => {
    const allUsers: Array<Record<string, any>> = [];

    const usersRepo = {
        create: jest.fn(async (data: any) => {
            const created = { id_user: BigInt(allUsers.length + 1), state: null, ...data };
            allUsers.push(created);
            return created;
        }),
        getByIdAsync: jest.fn(async (id: bigint) => allUsers.find(u => u.id_user === id) ?? null),
        update: jest.fn(async (id: bigint, data: any) => {
            const user = allUsers.find(u => u.id_user === id);
            if (!user) return null;
            Object.assign(user, data);
            return user;
        }),
        getAllWithFilters: jest.fn(async (filters: any) =>
            allUsers.filter(u => filters.id_client === undefined || u.id_client === filters.id_client)),
        countWithFilters: jest.fn(async (filters: any) =>
            allUsers.filter(u => filters.id_client === undefined || u.id_client === filters.id_client).length),
    } as never;

    const contextFor = (auth: unknown) => ({ get: jest.fn(() => auth) }) as never;

    beforeEach(() => {
        allUsers.length = 0;
        jest.clearAllMocks();
    });

    describe('CreateUserUseCase', () => {
        it('creates a user bound to the calling client when the caller is not admin', async () => {
            const useCase = new CreateUserUseCase(contextFor({ id_user: 10, is_admin: false }), usersRepo);

            const result = await useCase.run({ data: { id_type: 1, id_number: '123', first_name: 'Juan' } as never });

            expect((usersRepo as any).create).toHaveBeenCalledWith(expect.objectContaining({ id_client: 10n }));
            expect(result.id_user).toBe(1);
            expect(result.id_client).toBe(10);
            expect(result.first_name).toBe('Juan');
            expect(result.state).toBe(true);
        });

        it('allows admin to bind the new user to the id_client sent in the body', async () => {
            const useCase = new CreateUserUseCase(contextFor({ id_user: 1, is_admin: true }), usersRepo);

            await useCase.run({ data: { id_client: 55 } as never });

            expect((usersRepo as any).create).toHaveBeenCalledWith(expect.objectContaining({ id_client: 55n }));
        });

        it('creates the user without a client when an admin sends no id_client', async () => {
            const useCase = new CreateUserUseCase(contextFor({ id_user: 1, is_admin: true }), usersRepo);

            const result = await useCase.run({ data: { first_name: 'X' } as never });

            expect((usersRepo as any).create).toHaveBeenCalledWith(expect.objectContaining({ id_client: null }));
            expect(result.id_client).toBeNull();
        });

        it('refuses a non-admin requesting a user under another client', async () => {
            const useCase = new CreateUserUseCase(contextFor({ id_user: 10, is_admin: false }), usersRepo);

            await expect(useCase.run({ data: { id_client: 55 } } as never)).rejects.toBeInstanceOf(ActionNotAllowedException);
            expect((usersRepo as any).create).not.toHaveBeenCalled();
        });
    });

    describe('GetUsersUseCase', () => {
        it('forces the non-admin caller to its own client even when another id_client is sent', async () => {
            allUsers.push({ id_user: 1n, id_client: 10n, first_name: 'A', state: true });
            allUsers.push({ id_user: 2n, id_client: 55n, first_name: 'B', state: true });
            const useCase = new GetUsersUseCase(contextFor({ id_user: 10, is_admin: false }), usersRepo);

            const result = await useCase.run({ data: { id_client: 55, page: 2, limit: 10 } as never });

            expect((usersRepo as any).getAllWithFilters).toHaveBeenCalledWith({ id_client: 10n, page: 2, limit: 10 });
            expect((usersRepo as any).countWithFilters).toHaveBeenCalledWith({ id_client: 10n, page: 2, limit: 10 });
            expect(result.total_items).toBe(1);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].id_client).toBe(10);
            expect(result.data[0].id_user).toBe(1);
        });

        it('lists users of every client for an admin without id_client filter', async () => {
            allUsers.push({ id_user: 1n, id_client: 10n, first_name: 'A', state: true });
            allUsers.push({ id_user: 2n, id_client: 55n, first_name: 'B', state: true });
            const useCase = new GetUsersUseCase(contextFor({ id_user: 1, is_admin: true }), usersRepo);

            const result = await useCase.run({ data: {} as never });

            expect((usersRepo as any).getAllWithFilters).toHaveBeenCalledWith({ id_client: undefined, page: undefined, limit: undefined });
            expect(result.total_items).toBe(2);
            expect(result.data).toHaveLength(2);
        });

        it('filters by id_client when the admin sends it', async () => {
            allUsers.push({ id_user: 1n, id_client: 10n, first_name: 'A', state: true });
            const useCase = new GetUsersUseCase(contextFor({ id_user: 1, is_admin: true }), usersRepo);

            await useCase.run({ data: { id_client: 77 } as never });

            expect((usersRepo as any).getAllWithFilters).toHaveBeenCalledWith({ id_client: 77n, page: undefined, limit: undefined });
        });
    });

    describe('UpdateUserUseCase', () => {
        it('updates profile fields and the state toggle of an own user', async () => {
            allUsers.push({ id_user: 5n, id_client: 10n, first_name: 'Ana', state: true });
            const useCase = new UpdateUserUseCase(contextFor({ id_user: 10, is_admin: false }), usersRepo);

            const result = await useCase.run({ data: { id_user: 5n, first_name: 'Ana Paula', state: false } as never });

            const updatedPayload = (usersRepo as any).update.mock.calls[0][1];
            expect(updatedPayload).toEqual({ first_name: 'Ana Paula', state: false });
            expect(Object.keys(updatedPayload)).not.toContain('id_client');
            expect(result.first_name).toBe('Ana Paula');
            expect(result.state).toBe(false);
        });

        it('applies the birthdate sent by the caller', async () => {
            allUsers.push({ id_user: 5n, id_client: 10n, state: true });
            const useCase = new UpdateUserUseCase(contextFor({ id_user: 10, is_admin: false }), usersRepo);

            await useCase.run({ data: { id_user: 5n, birthdate: '1995-04-01' } as never });

            const updatedPayload = (usersRepo as any).update.mock.calls[0][1];
            expect(updatedPayload.birthdate).toEqual(new Date('1995-04-01'));
        });

        it('throws NotFound when the user does not exist', async () => {
            const useCase = new UpdateUserUseCase(contextFor({ id_user: 10, is_admin: false }), usersRepo);

            await expect(useCase.run({ data: { id_user: 999n, first_name: 'x' } } as never)).rejects.toBeInstanceOf(NotFoundException);
            expect((usersRepo as any).update).not.toHaveBeenCalled();
        });

        it('refuses a non-admin modifying a user of another client', async () => {
            allUsers.push({ id_user: 7n, id_client: 77n, first_name: 'X', state: true });
            const useCase = new UpdateUserUseCase(contextFor({ id_user: 10, is_admin: false }), usersRepo);

            await expect(useCase.run({ data: { id_user: 7n, first_name: 'y' } } as never)).rejects.toBeInstanceOf(ActionNotAllowedException);
            expect((usersRepo as any).update).not.toHaveBeenCalled();
        });

        it('allows an admin to modify the users of any client', async () => {
            allUsers.push({ id_user: 7n, id_client: 77n, first_name: 'X', state: true });
            const useCase = new UpdateUserUseCase(contextFor({ id_user: 1, is_admin: true }), usersRepo);

            const result = await useCase.run({ data: { id_user: 7n, state: false } as never });

            expect(result.state).toBe(false);
        });
    });
});
