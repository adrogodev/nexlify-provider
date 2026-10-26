import 'reflect-metadata';
import { CreateTemplateUseCase } from './create-template';
import { GetTemplatesUseCase } from './get-templates';
import { UpdateTemplateUseCase } from './update-template';
import { ActionNotAllowedException, NotFoundException } from 'src/core/domain/exceptions';

describe('Templates CRUD use cases', () => {
    const allTemplates: Array<Record<string, any>> = [];

    const templatesRepo = {
        create: jest.fn(async (data: any) => {
            // The repository/DB never receives id_template on create: the uuid
            // comes from the database (gen_random_uuid).
            const created = {
                id_template: allTemplates.length === 0
                    ? '11111111-1111-4111-8111-111111111111'
                    : '22222222-2222-4222-8222-222222222222',
                created_at: null,
                updated_at: null,
                ...data,
            };
            allTemplates.push(created);
            return created;
        }),
        getByIdAsync: jest.fn(async (id: string) => allTemplates.find(t => t.id_template === id) ?? null),
        update: jest.fn(async (id: string, data: any) => {
            const template = allTemplates.find(t => t.id_template === id);
            if (!template) return null;
            Object.assign(template, data);
            return template;
        }),
        getAllWithFilters: jest.fn(async (filters: any) =>
            allTemplates.filter(t => filters.is_active === undefined || t.is_active === filters.is_active)),
        countWithFilters: jest.fn(async (filters: any) =>
            allTemplates.filter(t => filters.is_active === undefined || t.is_active === filters.is_active).length),
    } as never;

    const contextFor = (auth: unknown) => ({ get: jest.fn(() => auth) }) as never;

    beforeEach(() => {
        allTemplates.length = 0;
        jest.clearAllMocks();
    });

    describe('CreateTemplateUseCase', () => {
        it('creates the template without id_template and applies the admin payload verbatim', async () => {
            const useCase = new CreateTemplateUseCase(contextFor({ id_user: 1, is_admin: true }), templatesRepo);

            const result = await useCase.run({
                data: { name: 'Bienvenida', subject: 'Hola', template: '<p>Hi</p>', is_active: false }
            } as never);

            const createPayload = (templatesRepo as any).create.mock.calls[0][0];
            expect(Object.keys(createPayload)).not.toContain('id_template');
            expect(createPayload).toEqual({ name: 'Bienvenida', subject: 'Hola', template: '<p>Hi</p>', is_active: false });
            expect(result.id_template).toBe('11111111-1111-4111-8111-111111111111');
            expect(result.subject).toBe('Hola');
            expect(result.is_active).toBe(false);
        });

        it('defaults is_active to true when the caller does not send it', async () => {
            const useCase = new CreateTemplateUseCase(contextFor({ id_user: 1, is_admin: true }), templatesRepo);

            const result = await useCase.run({ data: { name: 'X' } } as never);

            const createPayload = (templatesRepo as any).create.mock.calls[0][0];
            expect(createPayload.is_active).toBe(true);
            expect(result.is_active).toBe(true);
        });

        it('refuses a non-admin caller', async () => {
            const useCase = new CreateTemplateUseCase(contextFor({ id_user: 10, is_admin: false }), templatesRepo);

            await expect(useCase.run({ data: { name: 'X' } } as never)).rejects.toBeInstanceOf(ActionNotAllowedException);
            expect((templatesRepo as any).create).not.toHaveBeenCalled();
        });
    });

    describe('GetTemplatesUseCase', () => {
        it('forces active-only listing for a non-admin caller', async () => {
            allTemplates.push({ id_template: 'a', name: 'A', is_active: true });
            allTemplates.push({ id_template: 'b', name: 'B', is_active: false });
            const useCase = new GetTemplatesUseCase(contextFor({ id_user: 10, is_admin: false }), templatesRepo);

            const result = await useCase.run({ data: { page: 2, limit: 10 } } as never);

            expect((templatesRepo as any).getAllWithFilters).toHaveBeenCalledWith({ is_active: true, page: 2, limit: 10 });
            expect((templatesRepo as any).countWithFilters).toHaveBeenCalledWith({ is_active: true, page: 2, limit: 10 });
            expect(result.total_items).toBe(1);
            expect(result.page).toBe(2);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].id_template).toBe('a');
        });

        it('lists every template for an admin (active and inactive)', async () => {
            allTemplates.push({ id_template: 'a', name: 'A', is_active: true });
            allTemplates.push({ id_template: 'b', name: 'B', is_active: false });
            const useCase = new GetTemplatesUseCase(contextFor({ id_user: 1, is_admin: true }), templatesRepo);

            const result = await useCase.run({ data: {} } as never);

            expect((templatesRepo as any).getAllWithFilters).toHaveBeenCalledWith({ is_active: undefined, page: undefined, limit: undefined });
            expect((templatesRepo as any).countWithFilters).toHaveBeenCalledWith({ is_active: undefined, page: undefined, limit: undefined });
            expect(result.total_items).toBe(2);
            expect(result.data).toHaveLength(2);
        });
    });

    describe('UpdateTemplateUseCase', () => {
        it('updates subject, template content and is_active of an existing template', async () => {
            allTemplates.push({ id_template: '11111111-1111-4111-8111-111111111111', name: 'A', subject: 'old', template: 'old-body', is_active: true });
            const useCase = new UpdateTemplateUseCase(contextFor({ id_user: 1, is_admin: true }), templatesRepo);

            const result = await useCase.run({
                data: {
                    id_template: '11111111-1111-4111-8111-111111111111',
                    subject: 'new',
                    template: 'new-body',
                    is_active: false
                }
            } as never);

            const updatePayload = (templatesRepo as any).update.mock.calls[0][1];
            expect(updatePayload).toEqual({ subject: 'new', template: 'new-body', is_active: false });
            expect(Object.keys(updatePayload)).not.toContain('id_template');
            expect(Object.keys(updatePayload)).not.toContain('name');
            expect(result.subject).toBe('new');
            expect(result.is_active).toBe(false);
        });

        it('refuses a non-admin caller', async () => {
            const useCase = new UpdateTemplateUseCase(contextFor({ id_user: 10, is_admin: false }), templatesRepo);

            await expect(useCase.run({ data: { id_template: '11111111-1111-4111-8111-111111111111' } } as never))
                .rejects.toBeInstanceOf(ActionNotAllowedException);
            expect((templatesRepo as any).update).not.toHaveBeenCalled();
        });

        it('throws NotFound when the template does not exist', async () => {
            const useCase = new UpdateTemplateUseCase(contextFor({ id_user: 1, is_admin: true }), templatesRepo);

            await expect(useCase.run({ data: { id_template: '99999999-9999-4999-8999-999999999999', subject: 'x' } } as never))
                .rejects.toBeInstanceOf(NotFoundException);
            expect((templatesRepo as any).update).not.toHaveBeenCalled();
        });

        it('keeps the stored is_active value when the patch omits it', async () => {
            allTemplates.push({ id_template: '11111111-1111-4111-8111-111111111111', subject: 'old', is_active: true });
            const useCase = new UpdateTemplateUseCase(contextFor({ id_user: 1, is_admin: true }), templatesRepo);

            await useCase.run({ data: { id_template: '11111111-1111-4111-8111-111111111111', subject: 'new' } } as never);

            const updatePayload = (templatesRepo as any).update.mock.calls[0][1];
            expect(updatePayload).toEqual({ subject: 'new', template: undefined, is_active: undefined });
        });
    });
});
