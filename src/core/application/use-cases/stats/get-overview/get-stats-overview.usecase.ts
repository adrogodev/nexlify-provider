import type { IRequestContext } from 'src/core/application/contracts/infrastructure';
import type {
    EmailStatsScope,
    IEmailStatsRepository,
    IEmailsRepository,
    INexlifyConfigurationRepository,
} from 'src/core/application/contracts/persistence';
import type { IReplyAnalyzer } from 'src/core/application/contracts/services/reply-analyzer.service';
import { AiIntentEnum } from 'src/core/domain/enum';
import {
    ActionNotAllowedException,
    NotMatchException,
} from 'src/core/domain/exceptions';
import type { UseCase, UseCaseArgs } from 'src/core/domain/models';
import type { GetStatsOverviewInput } from './get-stats-overview.request-data';

export const DEFAULT_RANGE_DAYS = 30;
export const MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface StatsOverviewDTO {
    range: { from: string; to: string };
    totals: Record<string, number>;
    delivery_rate: number;
    bounce_rate: number;
    replies: number;
    daily: Array<{
        date: string;
        sent: number;
        failed: number;
        received: number;
    }>;
    /** `daily_limit`/`remaining` are null when no daily limit is configured. */
    budget: {
        daily_limit: number | null;
        used_today: number;
        remaining: number | null;
    };
    ai: { enabled: boolean; intents: Record<string, number> };
}

/**
 * Dashboard overview (S6): totals per state, delivery/bounce rates, replies,
 * zero-filled daily series and the remaining daily send budget. Clients are
 * always scoped to their own id_client; admins may filter one client.
 */
export class GetStatsOverviewUseCase
    implements UseCase<GetStatsOverviewInput, StatsOverviewDTO>
{
    constructor(
        private readonly _context: IRequestContext,
        private readonly _statsRepository: IEmailStatsRepository,
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _configurationRepository: INexlifyConfigurationRepository,
        private readonly _replyAnalyzer: IReplyAnalyzer,
    ) {}

    public run = async (
        args: UseCaseArgs<GetStatsOverviewInput>,
    ): Promise<StatsOverviewDTO> => {
        const input = args.data ?? {};
        const { fromDay, toDay } = this.#resolveRange(input.from, input.to);
        const scope: EmailStatsScope = {
            from: new Date(`${fromDay}T00:00:00.000Z`),
            to: new Date(`${toDay}T23:59:59.999Z`),
            id_client: this.#resolveClientScope(input.id_client),
        };

        const [totals, dailyRows, intentRows, budget] = await Promise.all([
            this._statsRepository.countByState(scope),
            this._statsRepository.dailySeries(scope),
            this._statsRepository.countByAiIntent(scope),
            this.#budget(),
        ]);

        const delivered = (totals['SENT'] ?? 0) + (totals['WARNING'] ?? 0);
        const failed = totals['FAILED'] ?? 0;
        const bounced = totals['BOUNCED'] ?? 0;

        return {
            range: { from: fromDay, to: toDay },
            totals,
            delivery_rate: ratio(delivered, delivered + failed + bounced),
            bounce_rate: ratio(bounced, delivered + bounced),
            replies: totals['RECEIVED'] ?? 0,
            daily: this.#zeroFilledDaily(fromDay, toDay, dailyRows),
            budget,
            ai: {
                enabled: this._replyAnalyzer.isEnabled(),
                intents: Object.fromEntries(
                    Object.values(AiIntentEnum).map((intent) => [
                        intent,
                        intentRows[intent] ?? 0,
                    ]),
                ),
            },
        };
    };

    #resolveClientScope(requested: number | undefined): bigint | undefined {
        const auth = this._context.get();
        if (auth?.is_admin === true) {
            return requested === undefined || requested === null
                ? undefined
                : BigInt(requested);
        }
        const own = BigInt(auth.id_user);
        if (
            requested !== undefined &&
            requested !== null &&
            BigInt(requested) !== own
        ) {
            throw new ActionNotAllowedException(
                'Solo puedes consultar las estadisticas de tu propio cliente',
            );
        }
        return own;
    }

    #resolveRange(
        from: string | undefined,
        to: string | undefined,
    ): { fromDay: string; toDay: string } {
        const toDay = to ?? new Date().toISOString().slice(0, 10);
        const toDate = parseDay(toDay, 'to');
        const fromDay =
            from ??
            new Date(toDate.getTime() - (DEFAULT_RANGE_DAYS - 1) * DAY_MS)
                .toISOString()
                .slice(0, 10);
        const fromDate = parseDay(fromDay, 'from');
        if (fromDate.getTime() > toDate.getTime()) {
            throw new NotMatchException(
                'El rango de fechas es invalido: from debe ser anterior o igual a to',
            );
        }
        if (
            (toDate.getTime() - fromDate.getTime()) / DAY_MS + 1 >
            MAX_RANGE_DAYS
        ) {
            throw new NotMatchException(
                `El rango de fechas no puede superar ${MAX_RANGE_DAYS} dias`,
            );
        }
        return { fromDay, toDay };
    }

    #zeroFilledDaily(
        fromDay: string,
        toDay: string,
        rows: StatsOverviewDTO['daily'],
    ): StatsOverviewDTO['daily'] {
        const byDate = new Map(rows.map((row) => [row.date, row]));
        const series: StatsOverviewDTO['daily'] = [];
        for (
            let cursor = parseDay(fromDay, 'from').getTime();
            cursor <= parseDay(toDay, 'to').getTime();
            cursor += DAY_MS
        ) {
            const date = new Date(cursor).toISOString().slice(0, 10);
            const row = byDate.get(date);
            series.push({
                date,
                sent: row?.sent ?? 0,
                failed: row?.failed ?? 0,
                received: row?.received ?? 0,
            });
        }
        return series;
    }

    /** Same daily-limit rule as the send path: limit minus sent/warning emails since local midnight. */
    async #budget(): Promise<StatsOverviewDTO['budget']> {
        const configuration =
            await this._configurationRepository.findConfiguration();
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const usedToday = await this._emailsRepository.countSentOn(
            startOfDay,
            now,
        );
        const limit = configuration?.daily_send_limit;
        if (limit === null || limit === undefined) {
            return {
                daily_limit: null,
                used_today: usedToday,
                remaining: null,
            };
        }
        return {
            daily_limit: limit,
            used_today: usedToday,
            remaining: Math.max(0, limit - usedToday),
        };
    }
}

function parseDay(day: string, field: string): Date {
    const date = new Date(`${day}T00:00:00.000Z`);
    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== day
    ) {
        throw new NotMatchException(
            `${field} no es una fecha valida (YYYY-MM-DD)`,
        );
    }
    return date;
}

function ratio(part: number, whole: number): number {
    if (whole <= 0) return 0;
    return Math.round((part / whole) * 10_000) / 10_000;
}
