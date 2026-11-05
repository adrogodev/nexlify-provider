import {
    ActionNotAllowedException,
    NotMatchException,
} from 'src/core/domain/exceptions';
import { GetStatsOverviewUseCase } from './get-stats-overview.usecase';

describe('GetStatsOverviewUseCase', () => {
    const zeroTotals = {
        QUEUED: 0,
        SENDING: 0,
        SENT: 0,
        WARNING: 0,
        FAILED: 0,
        RETRYING: 0,
        RECEIVED: 0,
        BOUNCED: 0,
        SUPPRESSED: 0,
    };

    const build = (
        opts: {
            isAdmin?: boolean;
            idUser?: number;
            totals?: Record<string, number>;
            daily?: Array<{
                date: string;
                sent: number;
                failed: number;
                received: number;
            }>;
            intents?: Record<string, number>;
            dailyLimit?: number | null;
            sentToday?: number;
            aiEnabled?: boolean;
        } = {},
    ) => {
        const context = {
            get: jest.fn(() => ({
                id_user: opts.idUser ?? 70,
                is_admin: opts.isAdmin ?? false,
            })),
        };
        const statsRepo = {
            countByState: jest.fn(async () => opts.totals ?? zeroTotals),
            dailySeries: jest.fn(async () => opts.daily ?? []),
            countByAiIntent: jest.fn(async () => opts.intents ?? {}),
        };
        const emailsRepo = {
            countSentOn: jest.fn(async () => opts.sentToday ?? 0),
        };
        const configRepo = {
            findConfiguration: jest.fn(async () => ({
                daily_send_limit:
                    opts.dailyLimit === undefined ? 500 : opts.dailyLimit,
            })),
        };
        const analyzer = {
            isEnabled: jest.fn(() => opts.aiEnabled ?? false),
            model: jest.fn(() => 'claude-opus-5-5'),
        };
        const useCase = new GetStatsOverviewUseCase(
            context as never,
            statsRepo as never,
            emailsRepo as never,
            configRepo as never,
            analyzer as never,
        );
        return { useCase, statsRepo, emailsRepo };
    };

    it('scopes a client to its own id_client and returns totals for every state', async () => {
        const { useCase, statsRepo } = build({
            totals: {
                ...zeroTotals,
                SENT: 8,
                WARNING: 2,
                FAILED: 3,
                BOUNCED: 1,
                RECEIVED: 4,
            },
        });

        const result = await useCase.run({
            data: { from: '2026-11-01', to: '2026-11-03' },
        });

        const scope = statsRepo.countByState.mock.calls[0][0] as {
            id_client: bigint;
            from: Date;
            to: Date;
        };
        expect(scope.id_client).toBe(70n);
        expect(scope.from.toISOString()).toBe('2026-11-01T00:00:00.000Z');
        expect(scope.to.toISOString()).toBe('2026-11-03T23:59:59.999Z');
        expect(Object.keys(result.totals)).toEqual(
            expect.arrayContaining(['BOUNCED', 'SUPPRESSED', 'RECEIVED']),
        );
        expect(result.replies).toBe(4);
        // delivered (SENT+WARNING=10) / (10 + FAILED 3 + BOUNCED 1)
        expect(result.delivery_rate).toBeCloseTo(10 / 14, 4);
        // BOUNCED 1 / (delivered 10 + bounced 1)
        expect(result.bounce_rate).toBeCloseTo(1 / 11, 4);
    });

    it('rejects a client asking for another client stats', async () => {
        const { useCase } = build({ idUser: 70 });

        await expect(
            useCase.run({ data: { id_client: 71 } }),
        ).rejects.toBeInstanceOf(ActionNotAllowedException);
    });

    it('lets an admin see every client or filter one', async () => {
        const { useCase, statsRepo } = build({ isAdmin: true });

        await useCase.run({ data: {} });
        await useCase.run({ data: { id_client: 12 } });

        expect(
            (statsRepo.countByState.mock.calls[0][0] as { id_client?: bigint })
                .id_client,
        ).toBeUndefined();
        expect(
            (statsRepo.countByState.mock.calls[1][0] as { id_client?: bigint })
                .id_client,
        ).toBe(12n);
    });

    it('zero-fills the daily series for every day of the range', async () => {
        const { useCase } = build({
            daily: [{ date: '2026-11-02', sent: 5, failed: 1, received: 2 }],
        });

        const result = await useCase.run({
            data: { from: '2026-11-01', to: '2026-11-03' },
        });

        expect(result.daily).toEqual([
            { date: '2026-11-01', sent: 0, failed: 0, received: 0 },
            { date: '2026-11-02', sent: 5, failed: 1, received: 2 },
            { date: '2026-11-03', sent: 0, failed: 0, received: 0 },
        ]);
    });

    it('defaults to the last 30 days ending today', async () => {
        const { useCase } = build();

        const result = await useCase.run({ data: {} });

        expect(result.daily).toHaveLength(30);
        expect(result.range.to).toBe(new Date().toISOString().slice(0, 10));
    });

    it('rejects an inverted or oversized range with 400', async () => {
        const { useCase } = build();

        await expect(
            useCase.run({ data: { from: '2026-11-05', to: '2026-11-01' } }),
        ).rejects.toBeInstanceOf(NotMatchException);
        await expect(
            useCase.run({ data: { from: '2024-01-01', to: '2026-11-01' } }),
        ).rejects.toBeInstanceOf(NotMatchException);
        await expect(
            useCase.run({ data: { from: '2026-02-30', to: '2026-03-01' } }),
        ).rejects.toBeInstanceOf(NotMatchException);
    });

    it('computes the remaining daily budget as daily_send_limit minus sent today', async () => {
        const { useCase, emailsRepo } = build({
            dailyLimit: 100,
            sentToday: 37,
        });

        const result = await useCase.run({ data: {} });

        expect(emailsRepo.countSentOn).toHaveBeenCalledTimes(1);
        expect(result.budget).toEqual({
            daily_limit: 100,
            used_today: 37,
            remaining: 63,
        });
    });

    it('never reports a negative budget and reports null when no limit is configured', async () => {
        expect(
            (
                await build({ dailyLimit: 10, sentToday: 15 }).useCase.run({
                    data: {},
                })
            ).budget.remaining,
        ).toBe(0);
        expect(
            (
                await build({ dailyLimit: null, sentToday: 15 }).useCase.run({
                    data: {},
                })
            ).budget,
        ).toEqual({
            daily_limit: null,
            used_today: 15,
            remaining: null,
        });
    });

    it('reports AI status and zero-filled intent counters', async () => {
        const { useCase } = build({
            aiEnabled: true,
            intents: { PAYMENT_PROMISE: 3 },
        });

        const result = await useCase.run({ data: {} });

        expect(result.ai.enabled).toBe(true);
        expect(result.ai.intents.PAYMENT_PROMISE).toBe(3);
        expect(result.ai.intents.UNSUBSCRIBE_REQUEST).toBe(0);
        expect(Object.keys(result.ai.intents)).toHaveLength(8);
    });

    it('returns zero rates when nothing was sent', async () => {
        const result = await build().useCase.run({ data: {} });

        expect(result.delivery_rate).toBe(0);
        expect(result.bounce_rate).toBe(0);
    });
});
