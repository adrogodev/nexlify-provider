import { SendEmailUseCase } from './send-email.usecase';
import { SendEmailInput } from './send-email.request-data';
import { TemplateContentService } from '../services/template-content.service';

describe('SendEmailUseCase', () => {
    const config = {
        id_configuration: 1n,
        sender_email: 'sender@nexlify.local',
        id_smtp_server: 5n,
        daily_send_limit: 500,
    };

    const createdEmail = {
        id_email: 100n,
        email_uuid: '11111111-2222-4333-8444-555555555555',
        short_code: 'NX-AAAAAA1',
        state: 'SENT',
        attempts: 1,
    };

    const template = {
        id_template: '22222222-2222-4222-8222-222222222222',
        subject: 'Factura {{numero}}',
        template: '<p>Hola {{nombre}}</p>',
        is_active: true,
    };

    const build = (overrides?: { config?: unknown; sentToday?: number; attemptResult?: unknown }) => {
        const cfg = overrides?.config !== undefined ? overrides.config : config;
        const emailsRepo = {
            create: jest.fn(async (data: unknown) => ({ ...createdEmail, ...data })),
            countSentOn: jest.fn(async () => overrides?.sentToday ?? 0),
        } as never;
        const configRepo = { findConfiguration: jest.fn(async () => cfg) } as never;
        const attempt = { attempt: jest.fn(async () => overrides?.attemptResult ?? { state: 'SENT', attempts: 1 }) } as never;
        const idGen = { generateUuid: () => createdEmail.email_uuid, generateShortCode: () => createdEmail.short_code } as never;
        const templatesRepo = { getByIdAsync: jest.fn(async () => template) } as never;
        const useCase = new SendEmailUseCase(configRepo, emailsRepo, attempt, idGen, new TemplateContentService(templatesRepo), { get: () => ({ id_user: 1, is_admin: true }) } as never);
        return { useCase, emailsRepo: emailsRepo as unknown as { create: jest.Mock; countSentOn: jest.Mock }, attempt: (attempt as unknown as { attempt: jest.Mock }).attempt };
    };

    const input: SendEmailInput = {
        from: 'origen@test.local',
        to: 'dest@test.local',
        subject: 'Hola',
        text: 'mensaje',
    } as never as SendEmailInput;

    it('persists the email as QUEUED with short code and DB-side uuid (code does not send email_uuid)', async () => {
        const { useCase, emailsRepo, attempt } = build();

        await useCase.run({ data: input });

        expect(emailsRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            short_code: createdEmail.short_code,
            state: 'QUEUED',
            attempts: 0,
            from_email: input.from,
            to_email: input.to,
            subject: input.subject,
        }));
        expect(emailsRepo.create.mock.calls[0][0].email_uuid).toBeUndefined();;
        expect(attempt).toHaveBeenCalledWith(100n);
    });

    it('returns the public identifiers and final state', async () => {
        const { useCase } = build();

        const result = await useCase.run({ data: input });

        expect(result).toEqual({
            email_uuid: createdEmail.email_uuid,
            short_code: createdEmail.short_code,
            state: 'SENT',
            attempts: 1,
        });
    });

    it('persists no template reference when sent without a template (regression)', async () => {
        const { useCase, emailsRepo } = build();

        await useCase.run({ data: { ...input, html: '<b>{{x}}</b>' } as SendEmailInput });

        const created = emailsRepo.create.mock.calls[0][0];
        expect(created.body_html).toBe('<b>{{x}}</b>');
        expect(created.body_text).toBe('mensaje');
        expect(created.id_template).toBeNull();
        expect(created.template_variables).toBeNull();
    });

    it('renders the template with its variables and stores id_template + template_variables', async () => {
        const { useCase, emailsRepo, attempt } = build();

        await useCase.run({
            data: {
                from: 'origen@test.local',
                to: 'dest@test.local',
                id_template: template.id_template,
                variables: { numero: 'F-7', nombre: '<Ana>' },
            } as never as SendEmailInput,
        });

        const created = emailsRepo.create.mock.calls[0][0];
        expect(created.subject).toBe('Factura F-7');
        expect(created.body_html).toBe('<p>Hola &lt;Ana&gt;</p>');
        expect(created.id_template).toBe(template.id_template);
        expect(JSON.parse(created.template_variables)).toEqual({ numero: 'F-7', nombre: '<Ana>' });
        expect(attempt).toHaveBeenCalledWith(100n);
    });

    it('rejects missing template variables before persisting anything', async () => {
        const { useCase, emailsRepo } = build();

        await expect(useCase.run({
            data: { from: 'o@test.local', to: 'd@test.local', id_template: template.id_template, variables: { numero: '1' } } as never as SendEmailInput,
        })).rejects.toThrow('Faltan variables de plantilla: nombre');
        expect(emailsRepo.create).not.toHaveBeenCalled();
    });

    it('throws when no configuration exists', async () => {
        const { useCase } = build({ config: null });
        await expect(useCase.run({ data: input })).rejects.toThrow(/configura/i);
    });

    it('throws never-persisted checks when the daily send limit is reached', async () => {
        const { useCase, emailsRepo } = build({ sentToday: 500 });
        await expect(useCase.run({ data: input })).rejects.toThrow(/limite|daily/i);
        expect(emailsRepo.create).not.toHaveBeenCalled();
    });
});
