import type { AiIntentEnum, AiSentimentEnum } from 'src/core/domain/enum';

/**
 * AI reply intelligence port (S8). The infrastructure adapter talks to the
 * LLM provider; use cases and tests only ever see this contract.
 */
export const REPLY_ANALYZER = Symbol('IReplyAnalyzer');

export interface ReplyAnalysisInput {
    subject: string;
    /** Plain-text reply body (already stripped of HTML by the caller). */
    text: string;
}

export interface ReplyAnalysisEntities {
    dates: string[];
    amounts: string[];
    references: string[];
}

export interface ReplyAnalysisResult {
    intent: AiIntentEnum;
    sentiment: AiSentimentEnum;
    /** Short summary in Spanish. */
    summary: string;
    entities: ReplyAnalysisEntities;
}

export interface IReplyAnalyzer {
    /** True only when the provider credentials are configured. */
    isEnabled(): boolean;
    /** Model identifier used for the analysis (reported by `GET api/ai/status`). */
    model(): string;
    /** Rejects on provider errors, refusals or unparseable output. */
    analyze(input: ReplyAnalysisInput): Promise<ReplyAnalysisResult>;
}
