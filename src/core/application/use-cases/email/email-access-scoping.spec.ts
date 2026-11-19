import { Email } from 'src/core/domain/entities/email.entity';
import { EmailDirectionEnum } from 'src/core/domain/enum';
import { NotFoundException } from 'src/core/domain/exceptions';
import { DiffuseEmailUseCase } from './diffuse-email/diffuse-email.usecase';
import { DownloadEmailAttachmentUseCase } from './get-email-detail/download-email-attachment.usecase';
import { GetEmailDetailUseCase } from './get-email-detail/get-email-detail.usecase';
import { GetEmailsUseCase } from './get-emails/get-emails.usecase';
import { RetryEmailUseCase } from './retry-email/retry-email.usecase';
import { SendEmailUseCase } from './send-email/send-email.usecase';
import { TemplateContentService } from './services/template-content.service';

/**
 * Tenant isolation on the email endpoints: a client (JWT session or X-API-Key)
 * only reads, retries and lists its own emails, and every email it sends is
 * stored under its id_client. Admins keep full access.
 */
describe('Email access scoping per client', () => {
    const OWNER_ID = 7;
    const OTHER_ID = 8;

    const contextFor = (id_user: number, is_admin: boolean) =>
        ({ get: () => ({ id_user, is_admin }) }) as never;
    const owner = contextFor(OWNER_ID, false);
    const other = contextFor(OTHER_ID, false);
    const admin = contextFor(1, true);

    const ownedEmail = {
        id_email: 100n,
        email_uuid: '11111111-2222-4333-8444-555555555555',
        short_code: 'NX-AAAAAA1',
        id_client: BigInt(OWNER_ID),
        from_email: 'a@test.local',
        to_email: 'b@test.local',
        subject: 'Hola',
        body_html: null,
        body_text: 'texto',
        state: 'FAILED',
        attempts: 3,
        next_retry_at: null,
        sent_at: null,
        created_at: new Date('2026-01-01'),
        updated_at: null,
        message_id: null,
        direction: EmailDirectionEnum.SENT,
        parent_email_id: null,
    } as unknown as Email;

    const attachment = {
        id_attachment: 3n,
        id_email: 100n,
        filename: 'factura.pdf',
        content_type: 'application/pdf',
        size_bytes: 10,
        content: Buffer.from('secreto').toString('base64'),
        created_at: new Date(),
        updated_at: null,
    };

    const buildReadSide = () => {
        const emailsRepo = {
            findByUuidOrShortCode: jest.fn(async () => ownedEmail),
            getByIdAsync: jest.fn(async () => null),
            getAllWithFilters: jest.fn(async () => [ownedEmail]),
            countWithFilters: jest.fn(async () => 1),
        };
        const logsRepo = { findByEmail: jest.fn(async () => []) };
        const attachmentsRepo = {
            findByEmail: jest.fn(async () => [attachment]),
        };
        const attemptService = {
            attempt: jest.fn(async () => ({ state: 'SENT', attempts: 4 })),
        };
        return { emailsRepo, logsRepo, attachmentsRepo, attemptService };
    };

    describe('GET api/email/:emailId (detail)', () => {
        it('returns NotFound when a client asks for another client email', async () => {
            const { emailsRepo, logsRepo, attachmentsRepo } = buildReadSide();
            const useCase = new GetEmailDetailUseCase(
                emailsRepo as never,
                logsRepo as never,
                attachmentsRepo as never,
                other,
            );

            await expect(
                useCase.run({ data: ownedEmail.short_code } as never),
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(logsRepo.findByEmail).not.toHaveBeenCalled();
            expect(attachmentsRepo.findByEmail).not.toHaveBeenCalled();
        });

        it('returns the email to its owner and to an admin', async () => {
            const { emailsRepo, logsRepo, attachmentsRepo } = buildReadSide();

            const asOwner = await new GetEmailDetailUseCase(
                emailsRepo as never,
                logsRepo as never,
                attachmentsRepo as never,
                owner,
            ).run({ data: ownedEmail.short_code } as never);
            const asAdmin = await new GetEmailDetailUseCase(
                emailsRepo as never,
                logsRepo as never,
                attachmentsRepo as never,
                admin,
            ).run({ data: ownedEmail.short_code } as never);

            expect(asOwner.email_uuid).toBe(ownedEmail.email_uuid);
            expect(asAdmin.email_uuid).toBe(ownedEmail.email_uuid);
        });
    });

    describe('GET api/email/:emailId/attachments/:index (download)', () => {
        it('returns NotFound and never reads the attachment content for another client', async () => {
            const { emailsRepo, attachmentsRepo } = buildReadSide();
            const useCase = new DownloadEmailAttachmentUseCase(
                emailsRepo as never,
                attachmentsRepo as never,
                other,
            );

            await expect(
                useCase.run({
                    data: { emailId: ownedEmail.short_code, index: 0 },
                } as never),
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(attachmentsRepo.findByEmail).not.toHaveBeenCalled();
        });

        it('lets the owner download its attachment', async () => {
            const { emailsRepo, attachmentsRepo } = buildReadSide();
            const useCase = new DownloadEmailAttachmentUseCase(
                emailsRepo as never,
                attachmentsRepo as never,
                owner,
            );

            const result = await useCase.run({
                data: { emailId: ownedEmail.short_code, index: 0 },
            } as never);

            expect(result.filename).toBe('factura.pdf');
        });
    });

    describe('POST api/email/:emailId/retry', () => {
        it('returns NotFound and never attempts a send for another client email', async () => {
            const { emailsRepo, attemptService } = buildReadSide();
            const useCase = new RetryEmailUseCase(
                emailsRepo as never,
                attemptService as never,
                other,
            );

            await expect(
                useCase.run({ data: ownedEmail.short_code } as never),
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(attemptService.attempt).not.toHaveBeenCalled();
        });

        it('retries the email for its owner', async () => {
            const { emailsRepo, attemptService } = buildReadSide();
            const useCase = new RetryEmailUseCase(
                emailsRepo as never,
                attemptService as never,
                owner,
            );

            const result = await useCase.run({
                data: ownedEmail.short_code,
            } as never);

            expect(attemptService.attempt).toHaveBeenCalledWith(
                ownedEmail.id_email,
            );
            expect(result.state).toBe('SENT');
        });
    });

    describe('GET api/email (list)', () => {
        it('forces the client own id_client, ignoring an id_client sent in the query', async () => {
            const { emailsRepo } = buildReadSide();
            const useCase = new GetEmailsUseCase(emailsRepo as never, other);

            await useCase.run({
                data: { id_client: BigInt(OWNER_ID), page: 1 },
            } as never);

            expect(emailsRepo.getAllWithFilters).toHaveBeenCalledWith(
                expect.objectContaining({ id_client: BigInt(OTHER_ID) }),
            );
            expect(emailsRepo.countWithFilters).toHaveBeenCalledWith(
                expect.objectContaining({ id_client: BigInt(OTHER_ID) }),
            );
        });

        it('forces the client own id_client when the query has none', async () => {
            const { emailsRepo } = buildReadSide();
            const useCase = new GetEmailsUseCase(emailsRepo as never, owner);

            await useCase.run({ data: {} } as never);

            expect(emailsRepo.getAllWithFilters).toHaveBeenCalledWith(
                expect.objectContaining({ id_client: BigInt(OWNER_ID) }),
            );
        });

        it('keeps the admin filters unchanged (all clients or the requested one)', async () => {
            const { emailsRepo } = buildReadSide();
            const useCase = new GetEmailsUseCase(emailsRepo as never, admin);

            await useCase.run({ data: { page: 2 } } as never);
            await useCase.run({
                data: { id_client: BigInt(OWNER_ID) },
            } as never);

            expect(emailsRepo.getAllWithFilters).toHaveBeenNthCalledWith(1, {
                page: 2,
            });
            expect(emailsRepo.getAllWithFilters).toHaveBeenNthCalledWith(2, {
                id_client: BigInt(OWNER_ID),
            });
        });
    });

    describe('sending stores the sender client as owner', () => {
        const config = {
            id_configuration: 1n,
            sender_email: 'sender@nexlify.local',
            id_smtp_server: 5n,
            daily_send_limit: null,
        };

        const buildWriteSide = () => {
            const emailsRepo = {
                create: jest.fn(async (data: Record<string, unknown>) => ({
                    ...data,
                    id_email: 1n,
                    email_uuid: 'db-uuid',
                    short_code: 'NX-CCCCCC1',
                })),
                countSentOn: jest.fn(async () => 0),
            };
            const configRepo = {
                findConfiguration: jest.fn(async () => config),
            };
            const attempt = {
                attempt: jest.fn(async () => ({ state: 'SENT', attempts: 1 })),
            };
            const idGen = {
                generateShortCode: () => 'NX-CCCCCC1',
                generateUuid: () => 'unused',
            };
            const templates = new TemplateContentService({
                getByIdAsync: jest.fn(async () => null),
            } as never);
            return { emailsRepo, configRepo, attempt, idGen, templates };
        };

        const sendInput = {
            from: 'origen@test.local',
            to: 'dest@test.local',
            subject: 'Hola',
            text: 'mensaje',
        };
        const diffuseInput = {
            to: ['a@test.local', 'b@test.local'],
            subject: 'Aviso',
            text: 'mensaje',
        };

        it('POST api/email/send stores id_client of the calling client', async () => {
            const deps = buildWriteSide();
            const useCase = new SendEmailUseCase(
                deps.configRepo as never,
                deps.emailsRepo as never,
                deps.attempt as never,
                deps.idGen as never,
                deps.templates,
                owner,
            );

            await useCase.run({ data: sendInput } as never);

            expect(deps.emailsRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ id_client: BigInt(OWNER_ID) }),
            );
        });

        it('POST api/email/send by an admin keeps id_client null', async () => {
            const deps = buildWriteSide();
            const useCase = new SendEmailUseCase(
                deps.configRepo as never,
                deps.emailsRepo as never,
                deps.attempt as never,
                deps.idGen as never,
                deps.templates,
                admin,
            );

            await useCase.run({ data: sendInput } as never);

            expect(deps.emailsRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ id_client: null }),
            );
        });

        it('POST api/email/diffuse stores id_client of the calling client on every recipient', async () => {
            const deps = buildWriteSide();
            const useCase = new DiffuseEmailUseCase(
                deps.configRepo as never,
                deps.emailsRepo as never,
                deps.idGen as never,
                deps.templates,
                owner,
            );

            await useCase.run({ data: diffuseInput } as never);

            expect(deps.emailsRepo.create).toHaveBeenCalledTimes(2);
            for (const [data] of deps.emailsRepo.create.mock.calls) {
                expect(data).toEqual(
                    expect.objectContaining({ id_client: BigInt(OWNER_ID) }),
                );
            }
        });
    });
});
