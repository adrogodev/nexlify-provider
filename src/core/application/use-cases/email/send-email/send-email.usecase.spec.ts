import { SendEmailUseCase } from './send-email.usecase';
import { SendEmailInput } from './send-email.request-data';

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

    const build = (overrides?: { config?: unknown; sentToday?: number; attemptResult?: unknown }) => {
        const cfg = overrides?.config !== undefined ? overrides.config : config;
        const emailsRepo = {
            create: jest.fn(async (data: unknown) => ({ ...createdEmail, ...data })),
            countSentOn: jest.fn(async () => overrides?.sentToday ?? 0),
        } as never;
        const configRepo = { findConfiguration: jest.fn(async () => cfg) } as never;
        const attempt = { attempt: jest.fn(async () => overrides?.attemptResult ?? { state: 'SENT', attempts: 1 }) } as never;
        const idGen = { generateUuid: () => createdEmail.email_uuid, generateShortCode: () => createdEmail.short_code } as never;
        const useCase = new SendEmailUseCase(configRepo, emailsRepo, attempt, idGen);
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
