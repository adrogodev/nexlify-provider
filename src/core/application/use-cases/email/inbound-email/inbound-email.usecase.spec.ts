import 'reflect-metadata';
import { InboundEmailUseCase } from './inbound-email.usecase';
import { EmailDirectionEnum, EmailStateEnum } from 'src/core/domain/enum';

describe('InboundEmailUseCase', () => {
    const parentEmail = {
        id_email: 10n,
        email_uuid: '11111111-1111-4111-8111-111111111111',
        short_code: 'NX-PARENT1',
        id_client: 70n,
        from_email: 'platform@nexlify.local',
        to_email: 'customer@test.local',
        subject: 'Original',
        body_html: null,
        body_text: 'original',
        state: EmailStateEnum.SENT,
        attempts: 1,
        next_retry_at: null,
        sent_at: new Date(),
        created_at: new Date(),
        updated_at: null,
        message_id: '<parent@server.local>',
        direction: EmailDirectionEnum.SENT,
        parent_email_id: null,
    };

    const build = (overrides?: { parent?: unknown; createThrows?: boolean; attachmentsCreateThrowsOn?: string }) => {
        let created = 0;
        // Without an explicit `parent: undefined` override the mock resolves the
        // shared parentEmail row (threaded flows); with it, nothing matches.
        const parent = overrides?.parent !== undefined ? overrides.parent : parentEmail;
        const parentIdOf = (row: unknown): string | undefined =>
            row !== null && row !== undefined ? (row as { message_id?: string }).message_id : undefined;
        const emailsRepo = {
            findByMessageId: jest.fn(async (messageId: string) => {
                if (parent !== null && messageId === parentIdOf(parent)) {
                    return parent;
                }
                return null;
            }),
            create: jest.fn(async (data: Record<string, unknown>) => {
                if (overrides?.createThrows) throw new Error('boom');
                created++;
                const id = BigInt(created);
                return {
                    ...data,
                    id_email: id,
                    email_uuid: `22222222-2222-4111-8111-00000000000${created}`,
                    created_at: data.created_at ?? null,
                    updated_at: null,
                } as unknown;
            }),
        } as never;
        const attachmentsRepo = {
            create: jest.fn(async (row: Record<string, unknown>) => {
                if (overrides?.attachmentsCreateThrowsOn !== undefined && row['filename'] === overrides.attachmentsCreateThrowsOn) {
                    throw new Error('boom');
                }
                return row;
            }),
        } as never;
        const idGen = { generateShortCode: jest.fn(() => 'NX-INBND01'), generateUuid: jest.fn(() => 'code-never-generates-uuid') } as never;
        const useCase = new InboundEmailUseCase(emailsRepo, attachmentsRepo, idGen);
        return {
            useCase,
            emailsRepo: emailsRepo as unknown as { findByMessageId: jest.Mock; create: jest.Mock },
            attachmentsRepo: attachmentsRepo as unknown as { create: jest.Mock },
            idGen: idGen as unknown as { generateShortCode: jest.Mock; generateUuid: jest.Mock },
        };
    };

    const input = (overrides?: Record<string, unknown>) => ({
        sender: 'customer@test.local',
        ...overrides,
    });

    it('threads a reply to the parent found by in_reply_to_message_id and inherits its client', async () => {
        const { useCase, attachmentsRepo } = build();

        const result = await useCase.run({
            data: input({ message_id: '<reply@server1.local>', in_reply_to_message_id: '<parent@server.local>' }),
        });

        expect(result.duplicate).toBe(false);
        expect(result.threaded).toBe(true);
        expect(result.parent_email_uuid).toBe(parentEmail.email_uuid);
        expect(attachmentsRepo.create).not.toHaveBeenCalled();
    });

    it('persists the received row with direction RECEIVED, state RECEIVED, attempts 0 and the captured message_id', async () => {
        const { useCase, emailsRepo } = build();

        const result = await useCase.run({
            data: input({ message_id: '<reply@server1.local>', in_reply_to_message_id: '<parent@server.local>' }),
        });

        expect(emailsRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            id_client: parentEmail.id_client,
            from_email: input().sender,
            to_email: parentEmail.from_email,
            state: EmailStateEnum.RECEIVED,
            attempts: 0,
            direction: EmailDirectionEnum.RECEIVED,
            parent_email_id: parentEmail.id_email,
            message_id: '<reply@server1.local>',
            next_retry_at: null,
            sent_at: null,
        }));
        expect(emailsRepo.create.mock.calls[0][0].email_uuid).toBeUndefined();
        expect(emailsRepo.create.mock.calls[0][0].id_email).toBeUndefined();
        expect(result.email_uuid).toBe('22222222-2222-4111-8111-000000000001');
        expect(result.received).toBe(true);
    });

    it('falls back to the first uuid-shaped token of references when there is no in_reply_to_message_id', async () => {
        const parentByUuidMessageId = {
            ...parentEmail,
            message_id: '<11111111-1111-4111-8111-111111111111@server.local>',
        };
        const { useCase } = build({ parent: parentByUuidMessageId });

        const result = await useCase.run({
            data: input({
                message_id: '<reply@server1.local>',
                references: '<noise-id@server.local> <11111111-1111-4111-8111-111111111111@server.local>',
            }),
        });

        expect(result.threaded).toBe(true);
        expect(result.parent_email_uuid).toBe(parentByUuidMessageId.email_uuid);
    });

    it('creates a standalone received email (no parent, no client) when nothing matches', async () => {
        const { useCase, emailsRepo } = build({ parent: undefined });

        const result = await useCase.run({ data: input({}) });

        expect(result.threaded).toBe(false);
        expect(result.parent_email_uuid).toBeNull();
        expect(emailsRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            id_client: null,
            parent_email_id: null,
            to_email: input().sender,
            direction: EmailDirectionEnum.RECEIVED,
            state: EmailStateEnum.RECEIVED,
        }));
    });

    it('carries received_at into the row creation timestamp and defaults to now when absent', async () => {
        const { useCase, emailsRepo } = build();
        const receivedAt = new Date('2026-10-26T10:00:00.000Z');

        await useCase.run({ data: input({ received_at: receivedAt }) });
        const withReceivedAt = emailsRepo.create.mock.calls[0][0] as Record<string, unknown>;
        expect(withReceivedAt['created_at']).toBe(receivedAt);

        await useCase.run({ data: input({}) });
        const withoutReceivedAt = emailsRepo.create.mock.calls[1][0] as Record<string, unknown>;
        expect(withoutReceivedAt['created_at']).toBeInstanceOf(Date);
    });

    it('ignores a duplicate of an already ingested message_id (idempotent ingestion)', async () => {
        const { useCase, emailsRepo } = build({
            parent: { ...parentEmail, message_id: '<reply@server1.local>', parent_email_id: 5n },
        });

        const result = await useCase.run({ data: input({ message_id: '<reply@server1.local>' }) });

        expect(result.received).toBe(true);
        expect(result.duplicate).toBe(true);
        expect(result.threaded).toBe(true);
        expect(result.attachments_ingested).toBe(0);
        expect(emailsRepo.create).not.toHaveBeenCalled();
    });

    describe('attachments', () => {
        it('persists metadata plus base64 content for every valid attachment', async () => {
            const { useCase, attachmentsRepo } = build();

            const result = await useCase.run({
                data: input({
                    attachments: [
                        { filename: 'ok-presized.pdf', contentType: 'application/pdf', size: 10, content: 'AAAA' },
                        { filename: 'ok-computed.pdf', contentType: 'application/pdf', content: Buffer.from('hola').toString('base64') },
                    ],
                }),
            });

            expect(result.attachments_ingested).toBe(2);
            expect(result.attachments_rejected).toEqual([]);
            expect(attachmentsRepo.create).toHaveBeenCalledTimes(2);
            const first = attachmentsRepo.create.mock.calls[0][0] as Record<string, unknown>;
            expect(first['id_email']).toBe(1n);
            expect(first['filename']).toBe('ok-presized.pdf');
            expect(first['content_type']).toBe('application/pdf');
            expect(first['size_bytes']).toBe(10);
            expect(first['content']).toBe('AAAA');
            const second = attachmentsRepo.create.mock.calls[1][0] as Record<string, unknown>;
            expect(second['size_bytes']).toBe(4);
            expect(second['content']).toBe(Buffer.from('hola').toString('base64'));
        });

        it('rejects a single attachment larger than 5MB without aborting the ingestion', async () => {
            const { useCase, attachmentsRepo, emailsRepo } = build();
            const oversized = { filename: 'huge.bin', contentType: 'application/octet-stream', size: 5 * 1024 * 1024 + 1 };
            const normal = { filename: 'ok.bin', content: Buffer.from('hola').toString('base64') };

            const result = await useCase.run({ data: input({ attachments: [oversized, normal] }) });

            expect(result.attachments_ingested).toBe(1);
            expect(result.attachments_rejected).toHaveLength(1);
            expect(result.attachments_rejected[0].filename).toBe('huge.bin');
            expect(result.attachments_rejected[0].reason).toMatch(/5MB|tamano/i);
            expect(attachmentsRepo.create).toHaveBeenCalledTimes(1);
            expect(emailsRepo.create).toHaveBeenCalledTimes(1);
        });

        it('rejects an attachment whose base64 content decodes to more than 5MB even without declared size', async () => {
            const { useCase, attachmentsRepo } = build();
            const content = Buffer.alloc(5 * 1024 * 1024 + 1, 97).toString('base64');

            const result = await useCase.run({
                data: input({ attachments: [{ filename: 'implicit-huge.bin', content }] }),
            });

            expect(result.attachments_ingested).toBe(0);
            expect(result.attachments_rejected[0].filename).toBe('implicit-huge.bin');
            expect(attachmentsRepo.create).not.toHaveBeenCalled();
        });

        it('keeps the ingestion alive when one attachment row fails to persist', async () => {
            const { useCase } = build({ attachmentsCreateThrowsOn: 'broken.bin' });

            const result = await useCase.run({
                data: input({
                    attachments: [
                        { filename: 'broken.bin' },
                        { filename: 'ok.bin', content: Buffer.from('x').toString('base64') },
                    ],
                }),
            });

            expect(result.attachments_ingested).toBe(1);
            expect(result.attachments_rejected).toHaveLength(1);
            expect(result.attachments_rejected[0].filename).toBe('broken.bin');
        });
    });
});
