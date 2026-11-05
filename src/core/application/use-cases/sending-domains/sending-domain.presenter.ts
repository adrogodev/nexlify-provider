import type { IRequestContext } from 'src/core/application/contracts/infrastructure';
import type { ISendingDomainsRepository } from 'src/core/application/contracts/persistence';
import type {
    SendingDomainDTO,
    SendingDomainDnsRecordDTO,
} from 'src/core/application/dtos';
import type { SendingDomain } from 'src/core/domain/entities/sending-domain.entity';
import { NotFoundException } from 'src/core/domain/exceptions';
import { SpfPolicyService } from './spf-policy.service';

export const dkimHost = (domain: SendingDomain): string =>
    `${domain.dkim_selector}._domainkey.${domain.domain}`;
export const dmarcHost = (domain: SendingDomain): string =>
    `_dmarc.${domain.domain}`;
export const dkimRecordValue = (publicKey: string): string =>
    `v=DKIM1; k=rsa; p=${publicKey}`;

/** Maps a domain row to its public shape: never exposes any key material. */
export const toSendingDomainDTO = (
    domain: SendingDomain,
    spfMechanism: string,
): SendingDomainDTO => {
    const dns_records: SendingDomainDnsRecordDTO[] = [
        {
            type: 'TXT',
            host: domain.domain,
            value: SpfPolicyService.recordValue(spfMechanism),
            purpose: 'SPF',
            verified: domain.spf_verified,
        },
        {
            type: 'TXT',
            host: dkimHost(domain),
            value: dkimRecordValue(domain.dkim_public_key),
            purpose: 'DKIM',
            verified: domain.dkim_verified,
        },
        {
            type: 'TXT',
            host: dmarcHost(domain),
            value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain.domain}`,
            purpose: 'DMARC',
            verified: domain.dmarc_verified,
        },
    ];
    return {
        domain_uuid: domain.domain_uuid,
        domain: domain.domain,
        id_client:
            domain.id_client === null || domain.id_client === undefined
                ? null
                : Number(domain.id_client),
        dkim_selector: domain.dkim_selector,
        spf_verified: domain.spf_verified,
        dkim_verified: domain.dkim_verified,
        dmarc_verified: domain.dmarc_verified,
        last_checked_at: domain.last_checked_at,
        created_at: domain.created_at,
        dns_records,
    };
};

/** Admin reaches every domain; a client only its own (others read as 404). */
export const findOwnedDomain = async (
    context: IRequestContext,
    repository: ISendingDomainsRepository,
    domainUuid: string,
): Promise<SendingDomain> => {
    const auth = context.get();
    const domain = await repository.findByUuid(domainUuid);
    if (domain === null) throw new NotFoundException('Dominio no encontrado');
    if (auth?.is_admin !== true && domain.id_client !== BigInt(auth.id_user)) {
        throw new NotFoundException('Dominio no encontrado');
    }
    return domain;
};
