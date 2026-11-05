import type { IRequestContext } from 'src/core/application/contracts/infrastructure';
import type { IEmailsRepository } from 'src/core/application/contracts/persistence';
import type { SuppressionDTO } from 'src/core/application/dtos';
import { SuppressionReasonEnum } from 'src/core/domain/enum';
import { ActionNotAllowedException } from 'src/core/domain/exceptions';
import { UseCase, UseCaseArgs } from 'src/core/domain/models';
import type { SuppressionService } from '../services/suppression.service';
import { toSuppressionDTO } from '../suppression.presenter';
import type { AddSuppressionInput } from './add-suppression.request-data';

/**
 * Manual suppression (S5). A client suppresses for itself; an admin may target
 * a client or, without id_client, add a platform-wide row. Idempotent per
 * (client, address): an existing row is returned unchanged.
 */
export class AddSuppressionUseCase
    implements UseCase<AddSuppressionInput, SuppressionDTO>
{
    constructor(
        private readonly _context: IRequestContext,
        private readonly _suppressionService: SuppressionService,
        private readonly _emailsRepository: IEmailsRepository,
    ) {}

    public run = async (
        args: UseCaseArgs<AddSuppressionInput>,
    ): Promise<SuppressionDTO> => {
        const auth = this._context.get();
        const authIsAdmin = auth?.is_admin === true;

        let id_client: bigint | null;
        const requested = args.data.id_client;
        if (requested !== undefined && requested !== null) {
            if (!authIsAdmin) {
                throw new ActionNotAllowedException(
                    'Solo un administrador puede agregar supresiones para otro cliente',
                );
            }
            id_client = BigInt(requested);
        } else {
            id_client = authIsAdmin ? null : BigInt(auth.id_user);
        }

        const { suppression } = await this._suppressionService.suppress({
            id_client,
            email: args.data.email,
            reason: SuppressionReasonEnum.MANUAL,
            details: args.data.details ?? null,
        });

        return await toSuppressionDTO(suppression, this._emailsRepository);
    };
}
