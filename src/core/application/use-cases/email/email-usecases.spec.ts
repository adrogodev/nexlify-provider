import { GetEmailDetailUseCase } from './get-email-detail/get-email-detail.usecase';
import { GetEmailsUseCase } from './get-emails/get-emails.usecase';
import { RetryEmailUseCase } from './retry-email/retry-email.usecase';
import { RetryDueEmailsUseCase } from './retry-due/retry-due-emails.usecase';
import { Email } from 'src/core/domain/entities/email.entity';
import { NotFoundException } from 'src/core/domain/exceptions';

describe('Email read + retry use cases', () => {
    const email = {
        id_email: 100n,
        email_uuid: '11111111-2222-4333-8444-555555555555',
        short_code: 'NX-AAAAAA1',
        id_client: null,
        from_email: 'a@test.local',
        to_email: 'b@test.local',
        subject: 'Hola',
        body_html: null,
        body_text: 'texto',
        state: 'RETRYING',
        attempts: 2,
        next_retry_at: new Date(),
        sent_at: null,
        created_at: new Date('2026-01-01'),
        updated_at: null,
    } as unknown as Email;

    const emailsRepo = {
        findByUuidOrShortCode: jest.fn(async (id: string) => (id.includes('NX') || id.includes('1111') ? email : null)),
        getAllWithFilters: jest.fn(async () => [email]),
        countWithFilters: jest.fn(async () => 7),
        findRetryable: jest.fn(async () => [email]),
        getByIdAsync: jest.fn(async (id: bigint) => (id === 100n ? email : null)),
        update: jest.fn(async () => email),
    } as never;

    const logsRepo = {
        create: jest.fn(async (log: unknown) => log),
        findByEmail: jest.fn(async () => [{ id_log: 1n, id_email: 100n, attempt: 1, level: 'ERROR', message: 'Fallo el envio', smtp_host: 'smtp.nexlify.local', created_at: new Date() }]),
    } as never;

    const attemptService = { attempt: jest.fn(async (id: bigint) => ({ ...email, id_email: id, state: 'SENT', attempts: 3 })) } as never;

    it('GetEmailDetailUseCase returns email + logs by uuid or short code', async () => {
        const useCase = new GetEmailDetailUseCase(emailsRepo, logsRepo);

        const result = await useCase.run({ data: 'NX-AAAAAA1' } as never);

        expect(result.email_uuid).toBe(email.email_uuid);
        expect(result.logs).toHaveLength(1);
        expect(result.logs[0].level).toBe('ERROR');
        expect(result.logs[0].id_log).toBe('1');
    });

    it('GetEmailDetailUseCase throws NotFound for unknown identifiers', async () => {
        const useCase = new GetEmailDetailUseCase(emailsRepo, logsRepo);
        await expect(useCase.run({ data: 'desconocido' } as never)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('GetEmailsUseCase returns paginated listing', async () => {
        const useCase = new GetEmailsUseCase(emailsRepo);

        const result = await useCase.run({ data: { page: 1, limit: 20 } } as never);

        expect(result.total_items).toBe(7);
        expect(result.page).toBe(1);
        expect(result.data).toHaveLength(1);
    });

    it('RetryEmailUseCase delegates the attempt to the shared service', async () => {
        const useCase = new RetryEmailUseCase(emailsRepo, attemptService);

        const result = await useCase.run({ data: '11111111-2222-4333-8444-555555555555' } as never);

        expect(result.state).toBe('SENT');
        expect(result.attempts).toBe(3);
        expect((attemptService as unknown as { attempt: jest.Mock }).attempt).toHaveBeenCalledWith(100n);
    });

    it('RetryEmailUseCase throws NotFound for unknown identifiers', async () => {
        const useCase = new RetryEmailUseCase(emailsRepo, attemptService);
        await expect(useCase.run({ data: 'desconocido' } as never)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('RetryDueEmailsUseCase attempts every due email without letting one failure break the batch', async () => {
        const failingAttempt = { attempt: jest.fn(async (id: bigint) => { if (String(id) === '200') throw new Error('boom'); return email; }) };
        const useCase = new RetryDueEmailsUseCase({
            findRetryable: jest.fn(async () => [{ ...email, id_email: 100n }, { ...email, id_email: 200n }]),
        } as never, failingAttempt as never);

        const result = await useCase.run({ data: null } as never);

        expect(result).toBe(2);
    });
});
