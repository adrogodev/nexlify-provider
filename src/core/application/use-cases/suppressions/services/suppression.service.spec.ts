import { SuppressionReasonEnum } from 'src/core/domain/enum';
import { SuppressionService } from './suppression.service';

describe('SuppressionService', () => {
    const row = (overrides: Record<string, unknown> = {}) => ({
        id_suppression: 1n,
        suppression_uuid: '44444444-4444-4444-8444-444444444444',
        id_client: 7n,
        email: 'dest@test.local',
        reason: SuppressionReasonEnum.HARD_BOUNCE,
        source_email_id: null,
        details: null,
        created_at: null,
        updated_at: null,
        ...overrides,
    });

    const build = (stored: Array<Record<string, unknown>> = []) => {
        const repo = {
            findByClientAndEmail: jest.fn(
                async (idClient: bigint | null, email: string) =>
                    stored.find(
                        (s) => s.id_client === idClient && s.email === email,
                    ) ?? null,
            ),
            findAllByEmail: jest.fn(async (email: string) =>
                stored.filter((s) => s.email === email),
            ),
            create: jest.fn(async (data: Record<string, unknown>) => ({
                ...row(),
                ...data,
            })),
        };
        return { service: new SuppressionService(repo as never), repo };
    };

    describe('suppress', () => {
        it('creates a normalized (trimmed, lower-cased) row when none exists for the client + address', async () => {
            const { service, repo } = build();

            const result = await service.suppress({
                id_client: 7n,
                email: '  Dest@Test.LOCAL ',
                reason: SuppressionReasonEnum.COMPLAINT,
                details: 'spam',
                source_email_id: 100n,
            });

            expect(result.created).toBe(true);
            expect(repo.create).toHaveBeenCalledWith({
                id_client: 7n,
                email: 'dest@test.local',
                reason: SuppressionReasonEnum.COMPLAINT,
                details: 'spam',
                source_email_id: 100n,
            });
        });

        it('dedupes per client + address and returns the existing row', async () => {
            const existing = row();
            const { service, repo } = build([existing]);

            const result = await service.suppress({
                id_client: 7n,
                email: 'DEST@test.local',
                reason: SuppressionReasonEnum.UNSUBSCRIBE,
            });

            expect(result).toEqual({ suppression: existing, created: false });
            expect(repo.create).not.toHaveBeenCalled();
        });

        it('truncates details to the 500-char column', async () => {
            const { service, repo } = build();

            await service.suppress({
                id_client: null,
                email: 'a@test.local',
                reason: SuppressionReasonEnum.MANUAL,
                details: 'x'.repeat(600),
            });

            expect(repo.create.mock.calls[0][0].details).toHaveLength(500);
        });
    });

    describe('findBlocking', () => {
        it('blocks with the client own row or a platform-wide row', async () => {
            const { service } = build([
                row({ id_client: null, email: 'global@test.local' }),
                row({ email: 'own@test.local' }),
            ]);

            expect(
                (await service.findBlocking(['global@test.local'], 7n))?.email,
            ).toBe('global@test.local');
            expect(
                (await service.findBlocking(['own@test.local'], 7n))?.email,
            ).toBe('own@test.local');
        });

        it('ignores another client row', async () => {
            const { service } = build([
                row({ id_client: 8n, email: 'other@test.local' }),
            ]);

            expect(
                await service.findBlocking(['other@test.local'], 7n),
            ).toBeNull();
        });

        it('applies any row when the email has no client (platform send)', async () => {
            const { service } = build([
                row({ id_client: 8n, email: 'other@test.local' }),
            ]);

            expect(
                (
                    await service.findBlocking(
                        ['ok@test.local', ' Other@Test.local '],
                        null,
                    )
                )?.email,
            ).toBe('other@test.local');
        });

        it('returns null when no recipient is suppressed', async () => {
            const { service } = build();

            expect(
                await service.findBlocking(
                    ['a@test.local', 'b@test.local'],
                    null,
                ),
            ).toBeNull();
        });
    });
});
