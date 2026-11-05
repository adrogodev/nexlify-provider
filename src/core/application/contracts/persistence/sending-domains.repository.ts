import { SendingDomain } from 'src/core/domain/entities/sending-domain.entity';
import type { EntityInput, IBaseRepository } from './base.repository';

export const SENDING_DOMAINS_REPOSITORY = Symbol('ISendingDomainsRepository');

type SendingDomainDbDefaults =
    | 'domain_uuid'
    | 'spf_verified'
    | 'dkim_verified'
    | 'dmarc_verified'
    | 'last_checked_at';

export interface ISendingDomainsRepository
    extends IBaseRepository<SendingDomain, 'id_domain'> {
    /** domain_uuid and the verification flags are DB-side defaults: allowed to omit on create. */
    create(
        entity: Omit<
            EntityInput<SendingDomain, 'id_domain'>,
            SendingDomainDbDefaults
        > &
            Partial<Pick<SendingDomain, SendingDomainDbDefaults>>,
    ): Promise<SendingDomain>;
    findByUuid(domainUuid: string): Promise<SendingDomain | null>;
    /** Case-insensitive exact domain lookup. */
    findByDomain(domain: string): Promise<SendingDomain | null>;
    /** `undefined` lists every domain (admin); a client id lists only that client's domains. */
    findAllByClient(idClient?: bigint): Promise<SendingDomain[]>;
}
