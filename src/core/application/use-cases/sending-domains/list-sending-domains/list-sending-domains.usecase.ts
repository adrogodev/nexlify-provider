import type { IRequestContext } from 'src/core/application/contracts/infrastructure';
import type { ISendingDomainsRepository } from 'src/core/application/contracts/persistence';
import type { SendingDomainDTO } from 'src/core/application/dtos';
import { UseCase, UseCaseArgs } from 'src/core/domain/models';
import { toSendingDomainDTO } from '../sending-domain.presenter';
import type { SpfPolicyService } from '../spf-policy.service';

/** Admin lists every domain; a client lists only its own. */
export class ListSendingDomainsUseCase
    implements UseCase<null, SendingDomainDTO[]>
{
    constructor(
        private readonly _context: IRequestContext,
        private readonly _sendingDomainsRepository: ISendingDomainsRepository,
        private readonly _spfPolicy: SpfPolicyService,
    ) {}

    public run = async (
        _args: UseCaseArgs<null>,
    ): Promise<SendingDomainDTO[]> => {
        const auth = this._context.get();
        const domains = await this._sendingDomainsRepository.findAllByClient(
            auth?.is_admin === true ? undefined : BigInt(auth.id_user),
        );
        const mechanism = await this._spfPolicy.mechanism();
        return domains.map((domain) => toSendingDomainDTO(domain, mechanism));
    };
}
