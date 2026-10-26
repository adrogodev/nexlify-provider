import { GetEmailDetailUseCase } from './get-email-detail/get-email-detail.usecase';
import { DownloadEmailAttachmentUseCase } from './get-email-detail/download-email-attachment.usecase';
import { GetEmailsUseCase } from './get-emails/get-emails.usecase';
import { RetryEmailUseCase } from './retry-email/retry-email.usecase';
import { RetryDueEmailsUseCase } from './retry-due/retry-due-emails.usecase';
import { Email } from 'src/core/domain/entities/email.entity';
import { EmailDirectionEnum } from 'src/core/domain/enum';
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
        message_id: null,
        direction: EmailDirectionEnum.SENT,
        parent_email_id: null,
    } as unknown as Email;

    const receivedReply = {
        ...email,
        id_email: 101n,
        email_uuid: '22222222-2222-4333-8444-666666666666',
        short_code: 'NX-BBBBBB1',
        state: 'RECEIVED',
        direction: EmailDirectionEnum.RECEIVED,
        parent_email_id: 100n,
    } as unknown as Email;

    const attachment = {
        id_attachment: 3n,
        id_email: 101n,
        filename: 'informe.pdf',
        content_type: 'application/pdf',
        size_bytes: 2048,
        content: Buffer.from('pdf-bytes').toString('base64'),
        created_at: new Date(),
        updated_at: null,
    };

    const emailsRepo = {
        findByUuidOrShortCode: jest.fn(async (id: string) => {
            if (id.includes('NX') || id.includes('1111')) return email;
            if (id.includes('2222') || id.includes('NX-BBBB')) return receivedReply;
            return null;
        }),
        getAllWithFilters: jest.fn(async () => [email]),
        countWithFilters: jest.fn(async () => 7),
        findRetryable: jest.fn(async () => [email]),
        getByIdAsync: jest.fn(async (id: bigint) => (id === 100n ? email : id === 101n ? receivedReply : null)),
        update: jest.fn(async () => email),
    } as never;

    const logsRepo = {
        create: jest.fn(async (log: unknown) => log),
        findByEmail: jest.fn(async () => [{ id_log: 1n, id_email: 100n, attempt: 1, level: 'ERROR', message: 'Fallo el envio', smtp_host: 'smtp.nexlify.local', created_at: new Date() }]),
    } as never;

    const attachmentsRepo = {
        findByEmail: jest.fn(async (id: bigint) => (id === 101n ? [attachment] : [])),
        getByIdAsync: jest.fn(async (id: bigint) => (id === 3n ? attachment : null)),
    } as never;

    const attemptService = { attempt: jest.fn(async (id: bigint) => ({ ...email, id_email: id, state: 'SENT', attempts: 3 })) } as never;

    it('GetEmailDetailUseCase returns email + logs by uuid or short code', async () => {
        const useCase = new GetEmailDetailUseCase(emailsRepo, logsRepo, attachmentsRepo);

        const result = await useCase.run({ data: 'NX-AAAAAA1' } as never);

        expect(result.email_uuid).toBe(email.email_uuid);
        expect(result.logs).toHaveLength(1);
        expect(result.logs[0].level).toBe('ERROR');
        expect(result.logs[0].id_log).toBe('1');
    });

    it('GetEmailDetailUseCase throws NotFound for unknown identifiers', async () => {
        const useCase = new GetEmailDetailUseCase(emailsRepo, logsRepo, attachmentsRepo);
        await expect(useCase.run({ data: 'desconocido' } as never)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('GetEmailDetailUseCase includes direction, parent uuid and attachment metadata without base64 content', async () => {
        const useCase = new GetEmailDetailUseCase(emailsRepo, logsRepo, attachmentsRepo);

        const result = await useCase.run({ data: receivedReply.email_uuid } as never);

        expect(result.direction).toBe(EmailDirectionEnum.RECEIVED);
        expect(result.parent_email_uuid).toBe(email.email_uuid);
        expect(result.attachments).toEqual([
            { filename: 'informe.pdf', content_type: 'application/pdf', size_bytes: 2048 },
        ]);
        expect(JSON.stringify(result.attachments)).not.toContain(Buffer.from('pdf-bytes').toString('base64'));
    });

    it('GetEmailDetailUseCase resolves a standalone received email with null parent and no attachments', async () => {
        const standalone = { ...receivedReply, id_email: 102n, parent_email_id: null } as unknown as Email;
        (emailsRepo as unknown as { findByUuidOrShortCode: jest.Mock }).findByUuidOrShortCode.mockImplementationOnce(async () => standalone);
        const useCase = new GetEmailDetailUseCase(emailsRepo, logsRepo, attachmentsRepo);

        const result = await useCase.run({ data: 'NX-CCCCCC1' } as never);

        expect(result.direction).toBe(EmailDirectionEnum.RECEIVED);
        expect(result.parent_email_uuid).toBeNull();
        expect(result.attachments).toEqual([]);
    });

    it('DownloadEmailAttachmentUseCase returns the base64 content with metadata for an in-range index', async () => {
        const useCase = new DownloadEmailAttachmentUseCase(emailsRepo, attachmentsRepo);

        const result = await useCase.run({ data: { emailId: receivedReply.email_uuid, index: 0 } });

        expect(result).toEqual({
            filename: 'informe.pdf',
            content_type: 'application/pdf',
            size_bytes: 2048,
            content_base64: Buffer.from('pdf-bytes').toString('base64'),
        });
    });

    it('DownloadEmailAttachmentUseCase throws NotFound when the attachment index is out of range', async () => {
        const useCase = new DownloadEmailAttachmentUseCase(emailsRepo, attachmentsRepo);

        await expect(useCase.run({ data: { emailId: receivedReply.email_uuid, index: 1 } }))
            .rejects.toBeInstanceOf(NotFoundException);
    });

    it('DownloadEmailAttachmentUseCase throws NotFound for an unknown email identifier', async () => {
        const useCase = new DownloadEmailAttachmentUseCase(emailsRepo, attachmentsRepo);

        await expect(useCase.run({ data: { emailId: 'desconocido', index: 0 } }))
            .rejects.toBeInstanceOf(NotFoundException);
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
            findQueued: jest.fn(async () => []),
            findRetryable: jest.fn(async () => [{ ...email, id_email: 100n }, { ...email, id_email: 200n }]),
        } as never, failingAttempt as never);

        const result = await useCase.run({ data: null } as never);

        expect(result).toBe(2);
    });
});
