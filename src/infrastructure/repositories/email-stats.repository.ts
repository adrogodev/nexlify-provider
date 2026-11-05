import { Injectable } from '@nestjs/common';
import { EmailState, Prisma } from '@prisma/client';
import type {
    EmailDailyStatsRow,
    EmailStatsScope,
    IEmailStatsRepository,
} from 'src/core/application/contracts/persistence/email-stats.repository';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Dashboard aggregates (S6). Totals and intents use Prisma `groupBy`; the
 * daily series is ONE parameterized `$queryRaw` (tagged template: every input
 * travels as a bind parameter, never interpolated into the SQL text).
 */
@Injectable()
export class EmailStatsRepository implements IEmailStatsRepository {
    constructor(private readonly prisma: PrismaService) {}

    public async countByState(
        scope: EmailStatsScope,
    ): Promise<Record<string, number>> {
        const rows = await this.prisma.emails.groupBy({
            by: ['state'],
            where: this.#createdInScope(scope),
            _count: { _all: true },
        });
        // Zero-filled from the Prisma enum: new states appear automatically.
        const totals: Record<string, number> = Object.fromEntries(
            Object.values(EmailState).map((state) => [state, 0]),
        );
        for (const row of rows) {
            totals[row.state] = row._count._all;
        }
        return totals;
    }

    public async dailySeries(
        scope: EmailStatsScope,
    ): Promise<EmailDailyStatsRow[]> {
        const clientFilter =
            scope.id_client === undefined
                ? Prisma.empty
                : Prisma.sql`AND id_client = ${scope.id_client}`;
        // sent_at is a UTC timestamp without zone; created_at is timestamptz:
        // both are normalized to UTC wall time before bucketing per day.
        const rows = await this.prisma.$queryRaw<
            Array<{
                date: string;
                sent: number;
                failed: number;
                received: number;
            }>
        >`
            SELECT to_char(date_trunc('day', COALESCE(sent_at, created_at AT TIME ZONE 'UTC')), 'YYYY-MM-DD') AS date,
                   (COUNT(*) FILTER (WHERE state::text IN ('SENT', 'WARNING')))::int AS sent,
                   (COUNT(*) FILTER (WHERE state::text = 'FAILED'))::int AS failed,
                   (COUNT(*) FILTER (WHERE state::text = 'RECEIVED'))::int AS received
            FROM emails
            WHERE COALESCE(sent_at, created_at AT TIME ZONE 'UTC') >= ${scope.from.toISOString()}::timestamp
              AND COALESCE(sent_at, created_at AT TIME ZONE 'UTC') <= ${scope.to.toISOString()}::timestamp
              ${clientFilter}
            GROUP BY 1
            ORDER BY 1`;
        return rows.map((row) => ({
            date: row.date,
            sent: Number(row.sent),
            failed: Number(row.failed),
            received: Number(row.received),
        }));
    }

    public async countByAiIntent(
        scope: EmailStatsScope,
    ): Promise<Record<string, number>> {
        const rows = await this.prisma.emails.groupBy({
            by: ['ai_intent'],
            where: {
                ...this.#createdInScope(scope),
                state: EmailState.RECEIVED,
                ai_intent: { not: null },
            },
            _count: { _all: true },
        });
        const intents: Record<string, number> = {};
        for (const row of rows) {
            if (row.ai_intent !== null)
                intents[row.ai_intent] = row._count._all;
        }
        return intents;
    }

    #createdInScope(scope: EmailStatsScope): Prisma.emailsWhereInput {
        return {
            created_at: { gte: scope.from, lte: scope.to },
            ...(scope.id_client === undefined
                ? {}
                : { id_client: scope.id_client }),
        };
    }
}
