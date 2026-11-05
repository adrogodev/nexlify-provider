import 'reflect-metadata';
import {
    EmailLogLevelEnum,
    EmailStateEnum,
    SuppressionReasonEnum,
} from 'src/core/domain/enum';
import {
    ActionNotAllowedException,
    NotFoundException,
} from 'src/core/domain/exceptions';
import { AddSuppressionUseCase } from './add-suppression';
import { ListSuppressionsUseCase } from './list-suppressions';
import { ProcessBounceUseCase } from './process-bounce';
import { RemoveSuppressionUseCase } from './remove-suppression';
import { SuppressionService } from './services/suppression.service';
import { UnsubscribeUseCase } from './unsubscribe';

describe('Suppression use cases (S5)', () => {
    const stored: Array<Record<string, any>> = [];

    const suppressionsRepo = {
        create: jest.fn(async (data: any) => {
            const row = {
                id_suppression: BigInt(stored.length + 1),
                suppression_uuid: `55555555-5555-4555-8555-00000000000${stored.length + 1}`,
                created_at: new Date('2026-11-05T00:00:00Z'),
                updated_at: null,
                ...data,
            };
            stored.push(row);
            return row;
        }),
        findByClientAndEmail: jest.fn(
            async (idClient: bigint | null, email: string) =>
                stored.find(
                    (s) => s.id_client === idClient && s.email === email,
                ) ?? null,
        ),
        findAllByEmail: jest.fn(async (email: string) =>
            stored.filter((s) => s.email === email),
        ),
        findByUuid: jest.fn(
            async (uuid: string) =>
                stored.find((s) => s.suppression_uuid === uuid) ?? null,
        ),
        delete: jest.fn(async (id: bigint) => {
            const index = stored.findIndex((s) => s.id_suppression === id);
            if (index >= 0) stored.splice(index, 1);
            return index >= 0;
        }),
        getAllWithFilters: jest.fn(async () => [...stored]),
        countWithFilters: jest.fn(async () => stored.length),
    };

    const sentEmail = () => ({
        id_email: 100n,
        email_uuid: '11111111-2222-4333-8444-555555555555',
        short_code: 'NX-AAAAAA1',
        id_client: 7n,
        to_email: 'dest@test.local',
        state: EmailStateEnum.SENT,
        attempts: 1,
        message_id: '<m1@smtp>',
        bounced_at: null,
    });

    const buildEmailsRepo = (email: Record<string, any> | null) => ({
        findByUuidOrShortCode: jest.fn(async (id: string) =>
            email && id === email.email_uuid ? email : null,
        ),
        findByMessageId: jest.fn(async (id: string) =>
            email && id === email.message_id ? email : null,
        ),
        getByIdAsync: jest.fn(async (id: bigint) =>
            email && id === email.id_email ? email : null,
        ),
        update: jest.fn(async (_id: bigint, patch: any) => ({
            ...email,
            ...patch,
        })),
    });
    const logsRepo = { create: jest.fn(async (row: unknown) => row) };
    const service = new SuppressionService(suppressionsRepo as never);
    const contextFor = (auth: unknown) =>
        ({ get: jest.fn(() => auth) }) as never;
    const client7 = contextFor({ id_user: 7, is_admin: false });
    const admin = contextFor({ id_user: 1, is_admin: true });

    beforeEach(() => {
        stored.length = 0;
        jest.clearAllMocks();
    });

    describe('ProcessBounceUseCase', () => {
        it('marks the email BOUNCED, logs it and suppresses the address on a hard bounce (found by email_uuid)', async () => {
            const emailsRepo = buildEmailsRepo(sentEmail());
            const useCase = new ProcessBounceUseCase(
                emailsRepo as never,
                logsRepo as never,
                service,
            );

            const result = await useCase.run({
                data: {
                    recipient: 'Dest@Test.local',
                    type: 'HARD_BOUNCE',
                    email_uuid: '11111111-2222-4333-8444-555555555555',
                    reason: '550 no such user',
                },
            } as never);

            expect(emailsRepo.update).toHaveBeenCalledWith(
                100n,
                expect.objectContaining({
                    state: EmailStateEnum.BOUNCED,
                    bounced_at: expect.any(Date),
                }),
            );
            expect(logsRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    id_email: 100n,
                    level: EmailLogLevelEnum.ERROR,
                    message: expect.stringContaining('550 no such user'),
                }),
            );
            expect(stored).toEqual([
                expect.objectContaining({
                    id_client: 7n,
                    email: 'dest@test.local',
                    reason: SuppressionReasonEnum.HARD_BOUNCE,
                    source_email_id: 100n,
                }),
            ]);
            expect(result).toEqual({
                email_uuid: '11111111-2222-4333-8444-555555555555',
                state: EmailStateEnum.BOUNCED,
                suppressed: true,
            });
        });

        it('finds the email by message_id and suppresses a complaint once (dedupe)', async () => {
            const emailsRepo = buildEmailsRepo(sentEmail());
            const useCase = new ProcessBounceUseCase(
                emailsRepo as never,
                logsRepo as never,
                service,
            );

            await useCase.run({
                data: {
                    recipient: 'dest@test.local',
                    type: 'COMPLAINT',
                    message_id: '<m1@smtp>',
                },
            } as never);
            await useCase.run({
                data: {
                    recipient: 'dest@test.local',
                    type: 'COMPLAINT',
                    message_id: '<m1@smtp>',
                },
            } as never);

            expect(stored).toHaveLength(1);
            expect(stored[0].reason).toBe(SuppressionReasonEnum.COMPLAINT);
        });

        it('only logs a soft bounce: no suppression and no state change', async () => {
            const emailsRepo = buildEmailsRepo(sentEmail());
            const useCase = new ProcessBounceUseCase(
                emailsRepo as never,
                logsRepo as never,
                service,
            );

            const result = await useCase.run({
                data: {
                    recipient: 'dest@test.local',
                    type: 'SOFT_BOUNCE',
                    message_id: '<m1@smtp>',
                    reason: 'mailbox full',
                },
            } as never);

            expect(stored).toHaveLength(0);
            expect(emailsRepo.update).not.toHaveBeenCalled();
            expect(logsRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: EmailLogLevelEnum.WARNING,
                    message: expect.stringContaining('mailbox full'),
                }),
            );
            expect(result).toEqual({
                email_uuid: '11111111-2222-4333-8444-555555555555',
                state: EmailStateEnum.SENT,
                suppressed: false,
            });
        });

        it('suppresses platform-wide when the email cannot be found', async () => {
            const useCase = new ProcessBounceUseCase(
                buildEmailsRepo(null) as never,
                logsRepo as never,
                service,
            );

            const result = await useCase.run({
                data: { recipient: 'ghost@test.local', type: 'HARD_BOUNCE' },
            } as never);

            expect(stored).toEqual([
                expect.objectContaining({
                    id_client: null,
                    email: 'ghost@test.local',
                    source_email_id: null,
                }),
            ]);
            expect(logsRepo.create).not.toHaveBeenCalled();
            expect(result).toEqual({
                email_uuid: null,
                state: null,
                suppressed: true,
            });
        });
    });

    describe('UnsubscribeUseCase', () => {
        const tokens = {
            verify: jest.fn((token: string) =>
                token === 'good'
                    ? { email: 'dest@test.local', id_client: 7n }
                    : null,
            ),
        };

        it('previews a valid token without suppressing', async () => {
            const useCase = new UnsubscribeUseCase(tokens as never, service);

            expect(await useCase.preview('good')).toEqual({
                email: 'dest@test.local',
                id_client: 7n,
            });
            expect(await useCase.preview('bad')).toBeNull();
            expect(stored).toHaveLength(0);
        });

        it('confirms with an UNSUBSCRIBE suppression for the token client, idempotently', async () => {
            const useCase = new UnsubscribeUseCase(tokens as never, service);

            expect(await useCase.run({ data: 'good' })).toEqual({
                unsubscribed: true,
                email: 'dest@test.local',
            });
            await useCase.run({ data: 'good' });

            expect(stored).toEqual([
                expect.objectContaining({
                    id_client: 7n,
                    email: 'dest@test.local',
                    reason: SuppressionReasonEnum.UNSUBSCRIBE,
                }),
            ]);
        });

        it('rejects an invalid token', async () => {
            await expect(
                new UnsubscribeUseCase(tokens as never, service).run({
                    data: 'bad',
                }),
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(stored).toHaveLength(0);
        });
    });

    describe('AddSuppressionUseCase', () => {
        it('adds a MANUAL suppression for the calling client', async () => {
            const result = await new AddSuppressionUseCase(
                client7,
                service,
                buildEmailsRepo(null) as never,
            ).run({
                data: { email: 'X@test.local', details: 'pedido del usuario' },
            } as never);

            expect(stored[0]).toEqual(
                expect.objectContaining({
                    id_client: 7n,
                    email: 'x@test.local',
                    reason: SuppressionReasonEnum.MANUAL,
                    details: 'pedido del usuario',
                }),
            );
            expect(result).toEqual(
                expect.objectContaining({
                    email: 'x@test.local',
                    reason: 'MANUAL',
                    id_client: 7,
                    source_email_id: null,
                }),
            );
        });

        it('lets only an admin add for another client, and admin without id_client adds platform-wide', async () => {
            await expect(
                new AddSuppressionUseCase(
                    client7,
                    service,
                    buildEmailsRepo(null) as never,
                ).run({
                    data: { email: 'a@test.local', id_client: 9 },
                } as never),
            ).rejects.toBeInstanceOf(ActionNotAllowedException);

            const platform = await new AddSuppressionUseCase(
                admin,
                service,
                buildEmailsRepo(null) as never,
            ).run({ data: { email: 'a@test.local' } } as never);
            expect(platform.id_client).toBeNull();
        });
    });

    describe('ListSuppressionsUseCase', () => {
        it('scopes a client to its own rows and maps the source email to its public uuid', async () => {
            stored.push({
                id_suppression: 1n,
                suppression_uuid: 'u1',
                id_client: 7n,
                email: 'a@test.local',
                reason: 'HARD_BOUNCE',
                details: null,
                source_email_id: 100n,
                created_at: null,
            });
            const useCase = new ListSuppressionsUseCase(
                client7,
                suppressionsRepo as never,
                buildEmailsRepo(sentEmail()) as never,
            );

            const result = await useCase.run({
                data: {
                    id_client: 9,
                    reason: SuppressionReasonEnum.HARD_BOUNCE,
                    page: 2,
                    limit: 5,
                },
            } as never);

            expect(suppressionsRepo.getAllWithFilters).toHaveBeenCalledWith({
                id_client: 7n,
                email: undefined,
                reason: 'HARD_BOUNCE',
                page: 2,
                limit: 5,
            });
            expect(result.total_items).toBe(1);
            expect(result.page).toBe(2);
            expect(result.data[0].source_email_id).toBe(
                '11111111-2222-4333-8444-555555555555',
            );
        });

        it('lets an admin list everything or filter by client', async () => {
            const useCase = new ListSuppressionsUseCase(
                admin,
                suppressionsRepo as never,
                buildEmailsRepo(null) as never,
            );

            await useCase.run({ data: {} } as never);
            await useCase.run({ data: { id_client: 9 } } as never);

            expect(
                suppressionsRepo.getAllWithFilters.mock.calls[0][0].id_client,
            ).toBeUndefined();
            expect(
                suppressionsRepo.getAllWithFilters.mock.calls[1][0].id_client,
            ).toBe(9n);
        });
    });

    describe('RemoveSuppressionUseCase', () => {
        it('removes an own row and hides another client row as not found', async () => {
            stored.push({
                id_suppression: 1n,
                suppression_uuid: 'own',
                id_client: 7n,
                email: 'a@test.local',
            });
            stored.push({
                id_suppression: 2n,
                suppression_uuid: 'other',
                id_client: 9n,
                email: 'b@test.local',
            });
            const useCase = new RemoveSuppressionUseCase(
                client7,
                suppressionsRepo as never,
            );

            await expect(useCase.run({ data: 'own' })).resolves.toEqual({
                deleted: true,
            });
            await expect(useCase.run({ data: 'other' })).rejects.toBeInstanceOf(
                NotFoundException,
            );
            expect(stored.map((s) => s.suppression_uuid)).toEqual(['other']);
        });

        it('lets an admin remove any row', async () => {
            stored.push({
                id_suppression: 2n,
                suppression_uuid: 'other',
                id_client: 9n,
                email: 'b@test.local',
            });

            await expect(
                new RemoveSuppressionUseCase(
                    admin,
                    suppressionsRepo as never,
                ).run({ data: 'other' }),
            ).resolves.toEqual({ deleted: true });
        });
    });
});
