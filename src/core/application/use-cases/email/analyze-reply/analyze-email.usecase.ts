import type { IRequestContext } from 'src/core/application/contracts/infrastructure';
import type { IEmailsRepository } from 'src/core/application/contracts/persistence';
import type { IReplyAnalyzer } from 'src/core/application/contracts/services/reply-analyzer.service';
import { EmailStateEnum } from 'src/core/domain/enum';
import {
    NotMatchException,
    ServiceUnavailableException,
} from 'src/core/domain/exceptions';
import type { UseCase, UseCaseArgs } from 'src/core/domain/models';
import { assertEmailAccess } from '../services/email-access';
import type { AiAnalysisDTO } from './ai-analysis.dto';
import type { ReplyAnalysisService } from './reply-analysis.service';

/**
 * `POST api/email/:emailId/analyze` (S8): re-runs the AI analysis of a
 * RECEIVED reply synchronously. 503 when no provider key is configured.
 * A manual re-run never re-sends webhooks.
 */
export class AnalyzeEmailUseCase implements UseCase<string, AiAnalysisDTO> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _replyAnalysisService: ReplyAnalysisService,
    ) {}

    public run = async (args: UseCaseArgs<string>): Promise<AiAnalysisDTO> => {
        const email = assertEmailAccess(
            this._context.get(),
            await this._emailsRepository.findByUuidOrShortCode(args.data),
        );

        if (email.state !== EmailStateEnum.RECEIVED) {
            throw new NotMatchException(
                'Solo se pueden analizar respuestas recibidas (estado RECEIVED)',
            );
        }
        if (!this._replyAnalysisService.isEnabled()) {
            throw new ServiceUnavailableException('Análisis IA deshabilitado');
        }

        try {
            return await this._replyAnalysisService.analyze(email);
        } catch {
            throw new ServiceUnavailableException(
                'No fue posible completar el análisis IA, intenta de nuevo más tarde',
            );
        }
    };
}

export interface AiStatusDTO {
    enabled: boolean;
    /** Configured model (reported even while disabled). */
    model: string;
}

/** `GET api/ai/status`: whether the AI reply intelligence is configured. */
export class GetAiStatusUseCase implements UseCase<null, AiStatusDTO> {
    constructor(private readonly _replyAnalyzer: IReplyAnalyzer) {}

    public run = async (_args: UseCaseArgs<null>): Promise<AiStatusDTO> => {
        return {
            enabled: this._replyAnalyzer.isEnabled(),
            model: this._replyAnalyzer.model(),
        };
    };
}
