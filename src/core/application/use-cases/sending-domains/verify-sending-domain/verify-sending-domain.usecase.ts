import type { IRequestContext } from 'src/core/application/contracts/infrastructure';
import type { ISendingDomainsRepository } from 'src/core/application/contracts/persistence';
import type { IDnsResolver } from 'src/core/application/contracts/services';
import type { SendingDomainDTO } from 'src/core/application/dtos';
import { UseCase, UseCaseArgs } from 'src/core/domain/models';
import {
    dkimHost,
    dmarcHost,
    findOwnedDomain,
    toSendingDomainDTO,
} from '../sending-domain.presenter';
import { SpfPolicyService } from '../spf-policy.service';

/** Extracts the `p=` tag of a DKIM record, whitespace-insensitive. */
const dkimPublicKeyOf = (record: string): string | null => {
    const compact = record.replace(/\s+/g, '');
    if (!/^v=DKIM1(;|$)/i.test(compact)) return null;
    const match = compact.match(/(?:^|;)p=([^;]*)/);
    return match ? match[1] : null;
};

const isDmarcRecord = (record: string): boolean =>
    /^v=DMARC1\s*(;|$)/i.test(record.trim());

/**
 * Resolves the published TXT records (S4) and stores spf/dkim/dmarc flags:
 * SPF must carry the suggested mechanism, DKIM must publish exactly the
 * generated public key, DMARC must be any `v=DMARC1` policy.
 */
export class VerifySendingDomainUseCase
    implements UseCase<string, SendingDomainDTO>
{
    constructor(
        private readonly _context: IRequestContext,
        private readonly _sendingDomainsRepository: ISendingDomainsRepository,
        private readonly _dnsResolver: IDnsResolver,
        private readonly _spfPolicy: SpfPolicyService,
    ) {}

    public run = async (
        args: UseCaseArgs<string>,
    ): Promise<SendingDomainDTO> => {
        const domain = await findOwnedDomain(
            this._context,
            this._sendingDomainsRepository,
            args.data,
        );
        const mechanism = await this._spfPolicy.mechanism();

        const [spfRecords, dkimRecords, dmarcRecords] = await Promise.all([
            this._dnsResolver.resolveTxt(domain.domain),
            this._dnsResolver.resolveTxt(dkimHost(domain)),
            this._dnsResolver.resolveTxt(dmarcHost(domain)),
        ]);

        const patch = {
            spf_verified: SpfPolicyService.isAuthorized(spfRecords, mechanism),
            dkim_verified: dkimRecords.some(
                (record) => dkimPublicKeyOf(record) === domain.dkim_public_key,
            ),
            dmarc_verified: dmarcRecords.some(isDmarcRecord),
            last_checked_at: new Date(),
        };

        const updated = await this._sendingDomainsRepository.update(
            domain.id_domain,
            patch,
        );
        return toSendingDomainDTO(
            updated ?? { ...domain, ...patch },
            mechanism,
        );
    };
}
