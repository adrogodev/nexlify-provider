import { EmailCertificate } from 'src/core/domain/entities/email-certificate.entity';
import type { EntityInput, IBaseRepository } from './base.repository';

export const EMAIL_CERTIFICATES_REPOSITORY = Symbol(
    'IEmailCertificatesRepository',
);

export interface IEmailCertificatesRepository
    extends IBaseRepository<EmailCertificate, 'id_certificate'> {
    /** certificate_uuid and issued_at are DB-side defaults: allowed to omit on create. */
    create(
        entity: Omit<
            EntityInput<EmailCertificate, 'id_certificate'>,
            'certificate_uuid' | 'issued_at'
        > &
            Partial<Pick<EmailCertificate, 'certificate_uuid' | 'issued_at'>>,
    ): Promise<EmailCertificate>;
    findByEmailId(idEmail: bigint): Promise<EmailCertificate | null>;
    findByCode(certificateCode: string): Promise<EmailCertificate | null>;
}
