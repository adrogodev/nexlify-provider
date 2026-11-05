export const EMAIL_STATS_REPOSITORY = Symbol('IEmailStatsRepository');

/** Range (inclusive day bounds, UTC) and optional client scope of every aggregate. */
export interface EmailStatsScope {
    from: Date;
    to: Date;
    /** Undefined = every client (admin without filter). */
    id_client?: bigint;
}

export interface EmailDailyStatsRow {
    /** YYYY-MM-DD (UTC). */
    date: string;
    sent: number;
    failed: number;
    received: number;
}

/**
 * Read-only aggregates for the dashboard (S6). Every method is a single
 * grouped/counted query: no row is loaded in memory.
 */
export interface IEmailStatsRepository {
    /** Count per state for EVERY persisted email state (zero-filled). */
    countByState(scope: EmailStatsScope): Promise<Record<string, number>>;
    /** Daily sent/failed/received series inside the range (only days with activity). */
    dailySeries(scope: EmailStatsScope): Promise<EmailDailyStatsRow[]>;
    /** Count per AI intent of analyzed RECEIVED replies inside the range. */
    countByAiIntent(scope: EmailStatsScope): Promise<Record<string, number>>;
}
