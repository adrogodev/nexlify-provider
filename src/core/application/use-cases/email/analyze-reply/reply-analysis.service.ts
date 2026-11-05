import type {
    IEmailsRepository,
    IUnsubscribeSuppressionsRepository,
} from 'src/core/application/contracts/persistence';
import type { IReplyAnalyzer } from 'src/core/application/contracts/services/reply-analyzer.service';
import type { Email } from 'src/core/domain/entities/email.entity';
import { AiIntentEnum } from 'src/core/domain/enum';
import type { ReplyWebhookFanOutService } from '../services/reply-webhook-fanout.service';
import type { AiAnalysisDTO } from './ai-analysis.dto';

export type ErrorReporter = (message: string) => void;

/** HTML -> plain text fallback when a reply carries no text part. */
export function stripHtml(html: string): string {
    return html
        .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n+/g, '\n')
        .trim();
}

/**
 * AI reply intelligence orchestration (S8): runs the analyzer port over a
 * RECEIVED reply, persists `ai_*`, suppresses the sender on
 * UNSUBSCRIBE_REQUEST and, after inbound ingestion, enqueues the
 * RECEIVED_REPLY webhooks carrying the analysis.
 */
export class ReplyAnalysisService {
    constructor(
        private readonly _replyAnalyzer: IReplyAnalyzer,
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _suppressionsRepository: IUnsubscribeSuppressionsRepository,
        private readonly _fanOutService: ReplyWebhookFanOutService,
        private readonly _reportError: ErrorReporter = (message) =>
            console.error(message),
    ) {}

    public isEnabled(): boolean {
        return this._replyAnalyzer.isEnabled();
    }

    /** Analyzes and persists; rejects when the provider fails (callers decide). */
    public analyze = async (reply: Email): Promise<AiAnalysisDTO> => {
        const text = reply.body_text?.trim()
            ? reply.body_text
            : stripHtml(reply.body_html ?? '');
        const result = await this._replyAnalyzer.analyze({
            subject: reply.subject ?? '',
            text,
        });
        const analyzedAt = new Date();
        const analysis: AiAnalysisDTO = {
            intent: result.intent,
            sentiment: result.sentiment,
            summary: result.summary,
            entities: result.entities,
            analyzed_at: analyzedAt,
        };

        await this._emailsRepository.update(reply.id_email, {
            ai_intent: result.intent,
            ai_sentiment: result.sentiment,
            ai_summary: result.summary,
            ai_data: JSON.stringify(result.entities),
            ai_analyzed_at: analyzedAt,
        });

        if (result.intent === AiIntentEnum.UNSUBSCRIBE_REQUEST) {
            try {
                await this._suppressionsRepository.addUnsubscribe({
                    id_client: reply.id_client ?? null,
                    email: reply.from_email,
                    source_email_id: reply.id_email,
                    details:
                        'Solicitud de baja detectada por el análisis IA de la respuesta',
                });
            } catch (error) {
                this._reportError(
                    `No se pudo registrar la supresion del correo ${reply.short_code}: ${error}`,
                );
            }
        }

        return analysis;
    };

    /**
     * Post-ingestion pipeline, launched fire-and-forget: the analysis runs
     * first so RECEIVED_REPLY subscribers get `ai_analysis`; when it fails
     * the webhooks still go out (with `ai_analysis: null`). Never rejects.
     */
    public analyzeAndFanOut = async (
        reply: Email,
        parent: Email | null,
    ): Promise<void> => {
        let analysis: AiAnalysisDTO | null = null;
        try {
            analysis = await this.analyze(reply);
        } catch (error) {
            this._reportError(
                `Fallo el analisis IA de la respuesta ${reply.short_code}: ${error}`,
            );
        }
        try {
            await this._fanOutService.fanOut(reply, parent, analysis);
        } catch (error) {
            this._reportError(
                `Fallo el encolado de webhooks de la respuesta ${reply.short_code}: ${error}`,
            );
        }
    };
}
