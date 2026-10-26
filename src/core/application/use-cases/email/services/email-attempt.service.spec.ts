import { EmailAttemptService } from './email-attempt.service';
import { Email } from 'src/core/domain/entities/email.entity';
import { EmailStateEnum, EmailLogLevelEnum } from 'src/core/domain/enum';

describe('EmailAttemptService', () => {
    const config = {
        id_configuration: 1n,
        sender_email: 'sender@nexlify.local',
        mail_application_password: 'app-pass',
        id_smtp_server: 5n,
        max_retries: 3,
        retry_interval_seconds: 60,
    };

    const smtpServer = { id_smpt_server: 5n, host: 'smtp.nexlify.local', port: 587 };

    const baseEmail = {
        id_email: 100n,
        email_uuid: 'e5f5c00b-1cba-4a2e-9b1f-3d5e88a01111',
        short_code: 'NX-AAAAAA1',
        id_client: null,
        from_email: 'sender@nexlify.local',
        to_email: 'dest@test.local',
        subject: 'Hola',
        body_html: null,
        body_text: 'texto',
        state: EmailStateEnum.QUEUED,
        attempts: 0,
        next_retry_at: null,
        sent_at: null,
        created_at: new Date(),
        updated_at: null,
    };

    const build = ({ config: cfg, server, mailerResult, existing }: { config?: unknown; server?: unknown; mailerResult?: unknown; existing?: Partial<Email> }) => {
        const email = { ...baseEmail, ...existing };
        const configRepo = { findConfiguration: jest.fn(async () => (cfg !== undefined ? cfg : config)) } as never;
        const smtpRepo = { getByIdAsync: jest.fn(async () => server ?? smtpServer) } as never;
        const emailsRepo = {
            getByIdAsync: jest.fn(async () => email),
            update: jest.fn(async (_id: unknown, patch: unknown) => ({ ...email, ...patch }) as unknown),
        } as never;
        const logRepo = { create: jest.fn(async (log: unknown) => log) } as never;
        const mailer = { send: jest.fn(async () => mailerResult ?? { ok: true, message: 'Correo enviado con exito' }) } as never;
        const service = new EmailAttemptService(configRepo, smtpRepo, emailsRepo as never, logRepo, mailer);
        return { service, emailsRepo: emailsRepo as unknown as { update: jest.Mock }, logRepo: logRepo as unknown as { create: jest.Mock }, mailer: mailer as unknown as { send: jest.Mock }, email };
    };

    it('records a SUCCESS log and marks SENT when attempt 1 succeeds', async () => {
        const { service, email, logRepo, emailsRepo } = build({});

        const result = await service.attempt(email as Email);

        expect(result.state).toBe(EmailStateEnum.SENT);
        expect(result.attempts).toBe(1);
        expect(logRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            attempt: 1,
            level: EmailLogLevelEnum.SUCCESS,
            smtp_host: 'smtp.nexlify.local',
        }));
        expect(emailsRepo.update).toHaveBeenCalled();
    });

    it('schedules a retry when the send fails and retries remain', async () => {
        const { service, email, logRepo } = build({
            mailerResult: { ok: false, message: 'SMTP connection refused' },
        });

        const result = await service.attempt(email as Email);

        expect(result.state).toBe(EmailStateEnum.RETRYING);
        expect(result.attempts).toBe(1);
        expect(result.next_retry_at).toBeInstanceOf(Date);
        expect(logRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            level: EmailLogLevelEnum.ERROR,
            message: expect.stringContaining('SMTP connection refused'),
        }));
    });

    it('marks FAILED when the last attempt fails', async () => {
        const { service, email } = build({
            mailerResult: { ok: false, message: 'SMTP connection refused' },
            existing: { attempts: 2, state: EmailStateEnum.RETRYING },
        });

        const result = await service.attempt(email as Email);

        expect(result.state).toBe(EmailStateEnum.FAILED);
        expect(result.attempts).toBe(3);
        expect(result.next_retry_at).toBeNull();
    });

    it('records a WARNING log and marks WARNING when the email arrives after retries', async () => {
        const { service, email, logRepo } = build({
            existing: { attempts: 1, state: EmailStateEnum.RETRYING },
        });

        const result = await service.attempt(email as Email);

        expect(result.state).toBe(EmailStateEnum.WARNING);
        expect(logRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            attempt: 2,
            level: EmailLogLevelEnum.WARNING,
        }));
    });

    it('throws when no configuration exists', async () => {
        const { service, email } = build({ config: null });
        await expect(service.attempt(email as Email)).rejects.toThrow(/configura/i);
    });

    it('throws when the configuration has no SMTP server linked', async () => {
        const { service, email } = build({ config: { ...config, id_smtp_server: null } });
        await expect(service.attempt(email as Email)).rejects.toThrow(/configura/i);
    });
});
