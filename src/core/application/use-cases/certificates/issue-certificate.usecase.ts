import type {
    IAppConfig,
    IHashGenerator,
    IIdGenerator,
    IRequestContext,
} from 'src/core/application/contracts/infrastructure';
import type {
    IEmailCertificatesRepository,
    IEmailSendLogsRepository,
    IEmailsRepository,
} from 'src/core/application/contracts/persistence';
import { EmailStateEnum } from 'src/core/domain/enum';
import { NotMatchException } from 'src/core/domain/exceptions';
import type { UseCase, UseCaseArgs } from 'src/core/domain/models';
import { assertEmailAccess } from '../email/services/email-access';
import {
    CERTIFICATE_CODE_LENGTH,
    CERTIFICATE_CODE_PREFIX,
    type CertificateDTO,
    buildEvidence,
    canonicalJson,
    contentHashInput,
    toCertificateDTO,
} from './certificate-evidence';

const CERTIFIABLE_STATES: ReadonlyArray<string> = [
    EmailStateEnum.SENT,
    EmailStateEnum.WARNING,
];

/**
 * Issues the immutable certificate of a SENT/WARNING email (S7). Idempotent:
 * an email has at most one certificate, and re-issuing returns it unchanged.
 */
export class IssueCertificateUseCase
    implements UseCase<string, CertificateDTO>
{
    constructor(
        private readonly _context: IRequestContext,
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _emailSendLogsRepository: IEmailSendLogsRepository,
        private readonly _certificatesRepository: IEmailCertificatesRepository,
        private readonly _hashGenerator: IHashGenerator,
        private readonly _idGenerator: IIdGenerator,
        private readonly _appConfig: IAppConfig,
    ) {}

    public run = async (args: UseCaseArgs<string>): Promise<CertificateDTO> => {
        const email = assertEmailAccess(
            this._context.get(),
            await this._emailsRepository.findByUuidOrShortCode(args.data),
        );

        const existing = await this._certificatesRepository.findByEmailId(
            email.id_email,
        );
        if (existing !== null) {
            return toCertificateDTO(existing, this._appConfig.PUBLIC_API_URL);
        }

        if (
            email.state === null ||
            email.state === undefined ||
            !CERTIFIABLE_STATES.includes(email.state)
        ) {
            throw new NotMatchException(
                'Solo se pueden certificar correos en estado SENT o WARNING',
            );
        }

        const [logs, replies] = await Promise.all([
            this._emailSendLogsRepository.findByEmail(email.id_email),
            this._emailsRepository.findByParentId(email.id_email),
        ]);

        const certificateCode = this._idGenerator.generateShortCode(
            CERTIFICATE_CODE_PREFIX,
            CERTIFICATE_CODE_LENGTH,
        );
        const issuedAt = new Date();
        const contentHash = this._hashGenerator.SHA256(contentHashInput(email));
        const evidence = canonicalJson(
            buildEvidence({
                certificateCode,
                issuedAt,
                contentHash,
                email,
                logs,
                replies,
            }),
        );
        const evidenceHash = this._hashGenerator.SHA256(evidence);

        try {
            const created = await this._certificatesRepository.create({
                certificate_code: certificateCode,
                id_email: email.id_email,
                content_hash: contentHash,
                evidence_hash: evidenceHash,
                evidence,
                issued_at: issuedAt,
            });
            return toCertificateDTO(created, this._appConfig.PUBLIC_API_URL);
        } catch (error) {
            // Concurrent issuance: the unique id_email constraint keeps one row; return it.
            const raced = await this._certificatesRepository.findByEmailId(
                email.id_email,
            );
            if (raced !== null) {
                return toCertificateDTO(raced, this._appConfig.PUBLIC_API_URL);
            }
            throw error;
        }
    };
}
