import type {
    IAppConfig,
    IRequestContext,
} from 'src/core/application/contracts/infrastructure';
import type {
    IEmailCertificatesRepository,
    IEmailsRepository,
} from 'src/core/application/contracts/persistence';
import type {
    CertificatePdfData,
    ICertificatePdfRenderer,
} from 'src/core/application/contracts/services/certificate-pdf.service';
import type { EmailCertificate } from 'src/core/domain/entities/email-certificate.entity';
import { NotFoundException } from 'src/core/domain/exceptions';
import type { UseCase, UseCaseArgs } from 'src/core/domain/models';
import { assertEmailAccess } from '../email/services/email-access';
import {
    type CertificateDTO,
    type CertificateEvidence,
    buildVerifyUrl,
    toCertificateDTO,
} from './certificate-evidence';

/** Shared lookup: the email must be visible to the caller and certified. */
async function findOwnedCertificate(
    context: IRequestContext,
    emailsRepository: IEmailsRepository,
    certificatesRepository: IEmailCertificatesRepository,
    emailId: string,
): Promise<EmailCertificate> {
    const email = assertEmailAccess(
        context.get(),
        await emailsRepository.findByUuidOrShortCode(emailId),
    );
    const certificate = await certificatesRepository.findByEmailId(
        email.id_email,
    );
    if (certificate === null) {
        throw new NotFoundException(
            'El correo no tiene un certificado emitido',
        );
    }
    return certificate;
}

export class GetCertificateUseCase implements UseCase<string, CertificateDTO> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _certificatesRepository: IEmailCertificatesRepository,
        private readonly _appConfig: IAppConfig,
    ) {}

    public run = async (args: UseCaseArgs<string>): Promise<CertificateDTO> => {
        const certificate = await findOwnedCertificate(
            this._context,
            this._emailsRepository,
            this._certificatesRepository,
            args.data,
        );
        return toCertificateDTO(certificate, this._appConfig.PUBLIC_API_URL);
    };
}

export interface CertificatePdfDTO {
    filename: string;
    content: Buffer;
}

/** Renders the stored evidence (never the live email) as the certificate PDF. */
export class GetCertificatePdfUseCase
    implements UseCase<string, CertificatePdfDTO>
{
    constructor(
        private readonly _context: IRequestContext,
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _certificatesRepository: IEmailCertificatesRepository,
        private readonly _pdfRenderer: ICertificatePdfRenderer,
        private readonly _appConfig: IAppConfig,
    ) {}

    public run = async (
        args: UseCaseArgs<string>,
    ): Promise<CertificatePdfDTO> => {
        const certificate = await findOwnedCertificate(
            this._context,
            this._emailsRepository,
            this._certificatesRepository,
            args.data,
        );
        const evidence = JSON.parse(
            certificate.evidence,
        ) as CertificateEvidence;

        const data: CertificatePdfData = {
            certificate_code: certificate.certificate_code,
            issued_at: certificate.issued_at,
            email_uuid: evidence.email.email_uuid,
            short_code: evidence.email.short_code,
            from_email: evidence.email.from_email,
            to_email: evidence.email.to_email,
            subject: evidence.email.subject,
            message_id: evidence.email.message_id,
            content_hash: certificate.content_hash,
            evidence_hash: certificate.evidence_hash,
            attempts: evidence.attempts.map((attempt) => ({
                timestamp: attempt.created_at,
                level: attempt.level,
                smtp_host: attempt.smtp_host,
                message: attempt.message,
            })),
            replies: evidence.replies.map((reply) => ({
                short_code: reply.short_code,
                from_email: reply.from_email,
                received_at: reply.received_at,
                subject: reply.subject,
            })),
            verify_url: buildVerifyUrl(
                this._appConfig.PUBLIC_API_URL,
                certificate.certificate_code,
            ),
        };

        return {
            filename: `certificado-${certificate.certificate_code}.pdf`,
            content: await this._pdfRenderer.render(data),
        };
    };
}
