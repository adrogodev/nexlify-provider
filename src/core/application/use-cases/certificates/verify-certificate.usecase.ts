import { IsString, Matches } from 'class-validator';
import type { IHashGenerator } from 'src/core/application/contracts/infrastructure';
import type {
    IEmailCertificatesRepository,
    IEmailsRepository,
} from 'src/core/application/contracts/persistence';
import { NotFoundException } from 'src/core/domain/exceptions';
import type { UseCase, UseCaseArgs } from 'src/core/domain/models';
import {
    type CertificateEvidence,
    maskRecipients,
} from './certificate-evidence';

export class CertificateCodeParam {
    @IsString()
    @Matches(/^NXC-[0-9A-Za-z]{1,26}$/, {
        message: 'code debe ser un codigo de certificado (NXC-XXXXXXXXXX)',
    })
    code: string;
}

export interface CertificateVerificationDTO {
    valid: boolean;
    certificate_code: string;
    issued_at: Date;
    content_hash: string;
    evidence_hash: string;
    email: {
        short_code: string;
        subject: string;
        to_email: string;
        sent_at: string | null;
        state: string | null;
    };
}

/**
 * Public verification (S7): `valid` recomputes the SHA-256 of the stored
 * canonical evidence and compares it with `evidence_hash`. Exposes no body
 * content and masks the recipients.
 */
export class VerifyCertificateUseCase
    implements UseCase<string, CertificateVerificationDTO>
{
    constructor(
        private readonly _certificatesRepository: IEmailCertificatesRepository,
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _hashGenerator: IHashGenerator,
    ) {}

    public run = async (
        args: UseCaseArgs<string>,
    ): Promise<CertificateVerificationDTO> => {
        const certificate = await this._certificatesRepository.findByCode(
            args.data,
        );
        if (certificate === null) {
            throw new NotFoundException('Certificado no encontrado');
        }

        const valid =
            this._hashGenerator.SHA256(certificate.evidence) ===
            certificate.evidence_hash;
        let evidence: CertificateEvidence | null = null;
        try {
            evidence = JSON.parse(certificate.evidence) as CertificateEvidence;
        } catch {
            evidence = null;
        }
        const email = await this._emailsRepository.getByIdAsync(
            certificate.id_email,
        );

        return {
            valid,
            certificate_code: certificate.certificate_code,
            issued_at: certificate.issued_at,
            content_hash: certificate.content_hash,
            evidence_hash: certificate.evidence_hash,
            email: {
                short_code:
                    evidence?.email.short_code ?? email?.short_code ?? '',
                subject: evidence?.email.subject ?? email?.subject ?? '',
                to_email: maskRecipients(
                    evidence?.email.to_email ?? email?.to_email ?? '',
                ),
                sent_at:
                    evidence?.email.sent_at ??
                    email?.sent_at?.toISOString() ??
                    null,
                // The current state is live (it may later become BOUNCED, for instance).
                state: email?.state ?? evidence?.email.state ?? null,
            },
        };
    };
}
