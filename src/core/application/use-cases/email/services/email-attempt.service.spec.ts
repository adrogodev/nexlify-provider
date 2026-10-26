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

    const build = ({
        config: cfg,
        server,
        mailerResult,
        existing,
        endpoints = [],
        webhookDeliveriesFail = false,
    }: {
        config?: unknown;
        server?: unknown;
        mailerResult?: unknown;
        existing?: Partial<Email>;
        endpoints?: Array<Record<string, unknown>>;
        webhookDeliveriesFail?: boolean;
    }) => {
        const email = { ...baseEmail, ...existing };
        const configRepo = { findConfiguration: jest.fn(async () => (cfg !== undefined ? cfg : config)) } as never;
        const smtpRepo = { getByIdAsync: jest.fn(async () => server ?? smtpServer) } as never;
        const emailsRepo = {
            getByIdAsync: jest.fn(async () => email),
            update: jest.fn(async (_id: unknown, patch: unknown) => ({ ...email, ...patch }) as unknown),
        } as never;
        const logRepo = { create: jest.fn(async (log: unknown) => log) } as never;
        const mailer = { send: jest.fn(async () => mailerResult ?? { ok: true, message: 'Correo enviado con exito' }) } as never;
        const webhookEndpointsRepo = { findActiveByClientId: jest.fn(async () => endpoints) } as never;
        const webhookDeliveriesRepo = {
            create: jest.fn(async (row: unknown) => {
                if (webhookDeliveriesFail) throw new Error('boom');
                return row;
            }),
        } as never;
        const service = new EmailAttemptService(configRepo, smtpRepo, emailsRepo as never, logRepo, mailer, webhookEndpointsRepo as never, webhookDeliveriesRepo as never);
        return {
            service,
            emailsRepo: emailsRepo as unknown as { update: jest.Mock },
            logRepo: logRepo as unknown as { create: jest.Mock },
            mailer: mailer as unknown as { send: jest.Mock },
            webhookEndpointsRepo: webhookEndpointsRepo as unknown as { findActiveByClientId: jest.Mock },
            webhookDeliveriesRepo: webhookDeliveriesRepo as unknown as { create: jest.Mock },
            email,
        };
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

    const activeEndpoints = [
        { id_endpoint: 11n, endpoint_uuid: '11111111-1111-4111-8111-111111111111', id_client: 70n, url: 'https://hooks.local/a', secret: 'aaa', is_active: true, created_at: null, updated_at: null },
        { id_endpoint: 22n, endpoint_uuid: '22222222-2222-4222-8222-222222222222', id_client: 70n, url: 'https://hooks.local/b', secret: 'bbb', is_active: true, created_at: null, updated_at: null },
    ];

    describe('delivery-status webhook enqueue', () => {
        it('enqueues one delivery per active endpoint when the email reaches SENT', async () => {
            const { service, email, webhookEndpointsRepo, webhookDeliveriesRepo } = build({
                existing: { id_client: 70n },
                endpoints: activeEndpoints,
            });

            await service.attempt(email as Email);

            expect(webhookEndpointsRepo.findActiveByClientId).toHaveBeenCalledWith(70n);
            expect(webhookDeliveriesRepo.create).toHaveBeenCalledTimes(2);
            expect(webhookDeliveriesRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                id_endpoint: 11n,
                id_email: 100n,
                event: EmailStateEnum.SENT,
                attempt: 0,
                next_retry_at: expect.any(Date),
            }));
            expect(webhookDeliveriesRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                id_endpoint: 22n,
                id_email: 100n,
                event: EmailStateEnum.SENT,
                attempt: 0,
                next_retry_at: expect.any(Date),
            }));
        });

        it('enqueues with the WARNING event after a successful retry', async () => {
            const { service, email, webhookDeliveriesRepo } = build({
                existing: { id_client: 70n, attempts: 1, state: EmailStateEnum.RETRYING },
                endpoints: activeEndpoints,
            });

            await service.attempt(email as Email);

            expect(webhookDeliveriesRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                id_endpoint: 11n,
                event: EmailStateEnum.WARNING,
                attempt: 0,
            }));
        });

        it('enqueues with the FAILED event when the last attempt fails', async () => {
            const { service, email, webhookDeliveriesRepo } = build({
                mailerResult: { ok: false, message: 'SMTP connection refused' },
                existing: { id_client: 70n, attempts: 2, state: EmailStateEnum.RETRYING },
                endpoints: activeEndpoints,
            });

            await service.attempt(email as Email);

            expect(webhookDeliveriesRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                id_endpoint: 11n,
                event: EmailStateEnum.FAILED,
                attempt: 0,
            }));
        });

        it('does not enqueue while the email is still scheduled for retry', async () => {
            const { service, email, webhookEndpointsRepo, webhookDeliveriesRepo } = build({
                mailerResult: { ok: false, message: 'SMTP connection refused' },
                existing: { id_client: 70n },
                endpoints: activeEndpoints,
            });

            await service.attempt(email as Email);

            expect(webhookEndpointsRepo.findActiveByClientId).not.toHaveBeenCalled();
            expect(webhookDeliveriesRepo.create).not.toHaveBeenCalled();
        });

        it('does not enqueue when the email has no client', async () => {
            const { service, email, webhookEndpointsRepo, webhookDeliveriesRepo } = build({ endpoints: activeEndpoints });

            await service.attempt(email as Email);

            expect(webhookEndpointsRepo.findActiveByClientId).not.toHaveBeenCalled();
            expect(webhookDeliveriesRepo.create).not.toHaveBeenCalled();
        });

        it('does not enqueue when the client has no active endpoints', async () => {
            const { service, email, webhookEndpointsRepo, webhookDeliveriesRepo } = build({
                existing: { id_client: 70n },
            });

            await service.attempt(email as Email);

            expect(webhookEndpointsRepo.findActiveByClientId).toHaveBeenCalledWith(70n);
            expect(webhookDeliveriesRepo.create).not.toHaveBeenCalled();
        });

        it('keeps the SENT outcome when the enqueue fails', async () => {
            const { service, email } = build({
                existing: { id_client: 70n },
                endpoints: activeEndpoints,
                webhookDeliveriesFail: true,
            });

            const result = await service.attempt(email as Email);

            expect(result.state).toBe(EmailStateEnum.SENT);
            expect(result.attempts).toBe(1);
        });
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
