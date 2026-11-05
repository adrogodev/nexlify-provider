import { Injectable } from '@nestjs/common';
import type { IEmailCertificatesRepository } from 'src/core/application/contracts/persistence/email-certificates.repository';
import { EmailCertificate } from 'src/core/domain/entities/email-certificate.entity';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class EmailCertificatesRepository
    extends BaseRepository<EmailCertificate, 'id_certificate'>
    implements IEmailCertificatesRepository
{
    constructor(prisma: PrismaService) {
        super(prisma, 'email_certificates', 'id_certificate');
    }

    public async findByEmailId(
        idEmail: bigint,
    ): Promise<EmailCertificate | null> {
        return await this._model.findUnique({ where: { id_email: idEmail } });
    }

    public async findByCode(
        certificateCode: string,
    ): Promise<EmailCertificate | null> {
        return await this._model.findUnique({
            where: { certificate_code: certificateCode },
        });
    }
}
