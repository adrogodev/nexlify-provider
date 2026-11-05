import type {
    IEmailSendLogsRepository,
    IEmailsRepository,
} from 'src/core/application/contracts/persistence';
import type { Email } from 'src/core/domain/entities/email.entity';
import {
    EmailLogLevelEnum,
    EmailStateEnum,
    SuppressionReasonEnum,
} from 'src/core/domain/enum';
import { UseCase, UseCaseArgs } from 'src/core/domain/models';
import type { SuppressionService } from '../services/suppression.service';
import {
    BounceType,
    type ProcessBounceInput,
} from './process-bounce.request-data';

export interface ProcessBounceResultDTO {
    email_uuid: string | null;
    state: EmailStateEnum | null;
    /** true when the address is (now or already) on the suppression list. */
    suppressed: boolean;
}

const UUID_SHAPE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Bounce / complaint ingestion (S5). HARD_BOUNCE and COMPLAINT mark the email
 * BOUNCED (+ bounced_at) and suppress the address for the email's client
 * (platform-wide when the email is unknown); SOFT_BOUNCE only leaves a log.
 */
export class ProcessBounceUseCase
    implements UseCase<ProcessBounceInput, ProcessBounceResultDTO>
{
    constructor(
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _emailSendLogsRepository: IEmailSendLogsRepository,
        private readonly _suppressionService: SuppressionService,
    ) {}

    public run = async (
        args: UseCaseArgs<ProcessBounceInput>,
    ): Promise<ProcessBounceResultDTO> => {
        const { recipient, type, reason } = args.data;
        const email = await this.#findEmail(
            args.data.email_uuid,
            args.data.message_id,
        );
        const permanent = type !== BounceType.SOFT_BOUNCE;
        const detail = reason ? `: ${reason}` : '';

        let finalEmail: Email | null = email;
        if (email !== null) {
            await this._emailSendLogsRepository.create({
                id_email: email.id_email,
                attempt: email.attempts ?? 0,
                level: permanent
                    ? EmailLogLevelEnum.ERROR
                    : EmailLogLevelEnum.WARNING,
                message: `${this.#label(type)} reportado para ${recipient}${detail}`,
                smtp_host: null,
            });

            if (permanent) {
                finalEmail = (await this._emailsRepository.update(
                    email.id_email,
                    {
                        state: EmailStateEnum.BOUNCED,
                        bounced_at: new Date(),
                        next_retry_at: null,
                    },
                )) ?? { ...email, state: EmailStateEnum.BOUNCED };
            }
        }

        if (permanent) {
            await this._suppressionService.suppress({
                id_client: email?.id_client ?? null,
                email: recipient,
                reason:
                    type === BounceType.COMPLAINT
                        ? SuppressionReasonEnum.COMPLAINT
                        : SuppressionReasonEnum.HARD_BOUNCE,
                details: reason ?? null,
                source_email_id: email?.id_email ?? null,
            });
        }

        return {
            email_uuid: finalEmail?.email_uuid ?? null,
            state: finalEmail?.state ?? null,
            suppressed: permanent,
        };
    };

    async #findEmail(
        emailUuid?: string,
        messageId?: string,
    ): Promise<Email | null> {
        if (emailUuid && UUID_SHAPE.test(emailUuid)) {
            const byUuid =
                await this._emailsRepository.findByUuidOrShortCode(emailUuid);
            if (byUuid !== null) return byUuid;
        }
        if (messageId) {
            return await this._emailsRepository.findByMessageId(messageId);
        }
        return null;
    }

    #label(type: BounceType): string {
        switch (type) {
            case BounceType.HARD_BOUNCE:
                return 'Rebote permanente';
            case BounceType.COMPLAINT:
                return 'Queja de spam';
            default:
                return 'Rebote temporal';
        }
    }
}
