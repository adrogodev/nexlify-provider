import type { IRequestContext } from 'src/core/application/contracts/infrastructure';
import type { ISendingDomainsRepository } from 'src/core/application/contracts/persistence';
import type { DeletedDTO } from 'src/core/application/dtos';
import { UseCase, UseCaseArgs } from 'src/core/domain/models';
import { findOwnedDomain } from '../sending-domain.presenter';

export class DeleteSendingDomainUseCase implements UseCase<string, DeletedDTO> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _sendingDomainsRepository: ISendingDomainsRepository,
    ) {}

    public run = async (args: UseCaseArgs<string>): Promise<DeletedDTO> => {
        const domain = await findOwnedDomain(
            this._context,
            this._sendingDomainsRepository,
            args.data,
        );
        await this._sendingDomainsRepository.delete(domain.id_domain);
        return { deleted: true };
    };
}
