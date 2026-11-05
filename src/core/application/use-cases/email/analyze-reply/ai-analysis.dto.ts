import type { Email } from 'src/core/domain/entities/email.entity';

export interface AiAnalysisDTO {
    intent: string;
    sentiment: string | null;
    summary: string | null;
    entities: { dates: string[]; amounts: string[]; references: string[] };
    analyzed_at: Date;
}

const EMPTY_ENTITIES = (): AiAnalysisDTO['entities'] => ({
    dates: [],
    amounts: [],
    references: [],
});

/** Stored `ai_*` columns -> API shape; null while the reply was never analyzed. */
export function toAiAnalysisDTO(email: Email): AiAnalysisDTO | null {
    if (
        email.ai_analyzed_at === null ||
        email.ai_analyzed_at === undefined ||
        !email.ai_intent
    ) {
        return null;
    }
    let entities = EMPTY_ENTITIES();
    if (email.ai_data) {
        try {
            const parsed = JSON.parse(email.ai_data) as Partial<
                AiAnalysisDTO['entities']
            >;
            entities = {
                dates: Array.isArray(parsed.dates) ? parsed.dates : [],
                amounts: Array.isArray(parsed.amounts) ? parsed.amounts : [],
                references: Array.isArray(parsed.references)
                    ? parsed.references
                    : [],
            };
        } catch {
            entities = EMPTY_ENTITIES();
        }
    }
    return {
        intent: email.ai_intent,
        sentiment: email.ai_sentiment ?? null,
        summary: email.ai_summary ?? null,
        entities,
        analyzed_at: email.ai_analyzed_at,
    };
}
