import type {
    IUnsubscribeTokenService,
    UnsubscribeTokenPayload,
} from 'src/core/application/contracts/services';
import { SuppressionReasonEnum } from 'src/core/domain/enum';
import { NotFoundException } from 'src/core/domain/exceptions';
import { UseCase, UseCaseArgs } from 'src/core/domain/models';
import type { SuppressionService } from '../services/suppression.service';

export interface UnsubscribeResultDTO {
    unsubscribed: true;
    email: string;
}

/**
 * Public signed unsubscribe link (S5, RFC 8058 one-click). `preview` only
 * validates the token (GET confirmation page); `run` suppresses the address
 * for the token's client with reason UNSUBSCRIBE (idempotent).
 */
export class UnsubscribeUseCase
    implements UseCase<string, UnsubscribeResultDTO>
{
    constructor(
        private readonly _unsubscribeTokens: IUnsubscribeTokenService,
        private readonly _suppressionService: SuppressionService,
    ) {}

    public preview = async (
        token: string,
    ): Promise<UnsubscribeTokenPayload | null> =>
        this._unsubscribeTokens.verify(token);

    public run = async (
        args: UseCaseArgs<string>,
    ): Promise<UnsubscribeResultDTO> => {
        const payload = this._unsubscribeTokens.verify(args.data);
        if (payload === null) {
            throw new NotFoundException('Enlace de desuscripcion invalido');
        }

        await this._suppressionService.suppress({
            id_client: payload.id_client,
            email: payload.email,
            reason: SuppressionReasonEnum.UNSUBSCRIBE,
            details: 'Desuscripcion desde el enlace del correo',
        });

        return { unsubscribed: true, email: payload.email };
    };
}
