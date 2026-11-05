import { Injectable } from '@nestjs/common';
import type { ISendingDomainsRepository } from 'src/core/application/contracts/persistence/sending-domains.repository';
import { SendingDomain } from 'src/core/domain/entities/sending-domain.entity';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class SendingDomainsRepository
    extends BaseRepository<SendingDomain, 'id_domain'>
    implements ISendingDomainsRepository
{
    constructor(prisma: PrismaService) {
        super(prisma, 'sending_domains', 'id_domain');
    }

    public async findByUuid(domainUuid: string): Promise<SendingDomain | null> {
        return await this._model.findUnique({
            where: { domain_uuid: domainUuid },
        });
    }

    public async findByDomain(domain: string): Promise<SendingDomain | null> {
        return await this._model.findFirst({
            where: { domain: { equals: domain, mode: 'insensitive' } },
        });
    }

    public async findAllByClient(idClient?: bigint): Promise<SendingDomain[]> {
        return await this._model.findMany({
            where: { id_client: idClient },
            orderBy: { id_domain: 'asc' },
        });
    }
}
