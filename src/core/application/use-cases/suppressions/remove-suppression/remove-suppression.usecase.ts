import type { IRequestContext } from 'src/core/application/contracts/infrastructure';
import type { ISuppressionsRepository } from 'src/core/application/contracts/persistence';
import type { DeletedDTO } from 'src/core/application/dtos';
import { NotFoundException } from 'src/core/domain/exceptions';
import { UseCase, UseCaseArgs } from 'src/core/domain/models';

/** Admin removes any row; a client only its own (others read as 404). */
export class RemoveSuppressionUseCase implements UseCase<string, DeletedDTO> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _suppressionsRepository: ISuppressionsRepository,
    ) {}

    public run = async (args: UseCaseArgs<string>): Promise<DeletedDTO> => {
        const auth = this._context.get();
        const suppression = await this._suppressionsRepository.findByUuid(
            args.data,
        );
        if (suppression === null)
            throw new NotFoundException('Supresion no encontrada');
        if (
            auth?.is_admin !== true &&
            suppression.id_client !== BigInt(auth.id_user)
        ) {
            throw new NotFoundException('Supresion no encontrada');
        }

        await this._suppressionsRepository.delete(suppression.id_suppression);
        return { deleted: true };
    };
}
