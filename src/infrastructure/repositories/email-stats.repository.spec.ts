import { EmailState } from '@prisma/client';
import { EmailStatsRepository } from './email-stats.repository';

describe('EmailStatsRepository', () => {
    const scope = {
        from: new Date('2026-11-01T00:00:00.000Z'),
        to: new Date('2026-11-03T23:59:59.999Z'),
        id_client: 70n,
    };

    const build = () => {
        const prisma = {
            emails: {
                groupBy: jest.fn(async () => [
                    { state: 'SENT', _count: { _all: 4 } },
                    { state: 'RECEIVED', _count: { _all: 2 } },
                ]),
            },
            $queryRaw: jest.fn(async () => [
                { date: '2026-11-02', sent: 4, failed: 1, received: 2 },
            ]),
        };
        return { repo: new EmailStatsRepository(prisma as never), prisma };
    };

    it('zero-fills totals for every Prisma EmailState and scopes by client', async () => {
        const { repo, prisma } = build();

        const totals = await repo.countByState(scope);

        expect(Object.keys(totals).sort()).toEqual(
            Object.values(EmailState).sort(),
        );
        expect(totals.SENT).toBe(4);
        expect(totals.FAILED).toBe(0);
        expect(prisma.emails.groupBy).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    created_at: { gte: scope.from, lte: scope.to },
                    id_client: 70n,
                },
            }),
        );
    });

    it('builds the daily series with a single parameterized query (inputs bound, never interpolated)', async () => {
        const { repo, prisma } = build();

        const rows = await repo.dailySeries(scope);

        expect(rows).toEqual([
            { date: '2026-11-02', sent: 4, failed: 1, received: 2 },
        ]);
        expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
        const [strings, ...values] = prisma.$queryRaw.mock
            .calls[0] as unknown as [TemplateStringsArray, ...unknown[]];
        const sqlText = strings.join('?');
        expect(sqlText).not.toContain('2026-11-01');
        expect(values).toEqual(
            expect.arrayContaining([
                scope.from.toISOString(),
                scope.to.toISOString(),
            ]),
        );
        // The client filter is a nested Prisma.sql fragment whose id travels as a bind value.
        const clientFilter = values.find(
            (value) =>
                typeof value === 'object' &&
                value !== null &&
                'values' in value,
        ) as { values: unknown[]; strings: string[] };
        expect(clientFilter.values).toEqual([70n]);
        expect(clientFilter.strings.join('?')).not.toContain('70');
    });
});
