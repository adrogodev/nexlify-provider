import type { IEmailsRepository, IEmailSendLogsRepository } from "src/core/application/contracts/persistence";
import type { INexlifyConfigurationRepository, ISmtpServerRepository } from "src/core/application/contracts/persistence";
import type { IMailerService } from "src/core/application/contracts/services";
import { Email } from "src/core/domain/entities/email.entity";
import { EmailLogLevelEnum, EmailStateEnum } from "src/core/domain/enum";

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_INTERVAL_SECONDS = 60;

/**
 * Performs one send attempt for an already-persisted email record:
 * resolves the transport, sends, writes the audit log (SUCCESS/WARNING/ERROR)
 * and updates the email state machine (SENT / WARNING / RETRYING / FAILED).
 */
export class EmailAttemptService {
    constructor(
        private readonly _nexlifyConfigurationRepository: INexlifyConfigurationRepository,
        private readonly _smtpServerRepository: ISmtpServerRepository,
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _emailSendLogsRepository: IEmailSendLogsRepository,
        private readonly _mailerService: IMailerService,
    ) { }

    public attempt = async (emailId: bigint): Promise<Email> => {
        const email = await this._emailsRepository.getByIdAsync(emailId);
        if (email === null) {
            throw new Error('El correo solicitado no existe');
        }

        const configuration = await this._nexlifyConfigurationRepository.findConfiguration();
        if (configuration === null) {
            throw new Error('No se ha realizado la configuración para el uso de la plataforma');
        }
        if (configuration.id_smtp_server === null) {
            throw new Error('No se ha configurado el servidor SMTP en la plataforma');
        }
        const smtpServer = await this._smtpServerRepository.getByIdAsync(configuration.id_smtp_server);
        if (smtpServer === null) {
            throw new Error('No se ha configurado el servidor SMTP en la plataforma');
        }

        const attempt = (email.attempts ?? 0) + 1;
        const maxRetries = configuration.max_retries ?? DEFAULT_MAX_RETRIES;
        const intervalSeconds = configuration.retry_interval_seconds ?? DEFAULT_RETRY_INTERVAL_SECONDS;

        const mailerResult = await this._mailerService.send({
            transporter: {
                host: smtpServer.host ?? '',
                port: smtpServer.port ?? 587,
                secure: smtpServer.port === 465,
                user: configuration.sender_email,
                password: configuration.mail_application_password ?? ''
            },
            email: {
                from: email.from_email,
                to: email.to_email,
                subject: email.subject,
                html: email.body_html ?? undefined,
                text: email.body_text ?? undefined,
            }
        });

        const level = !mailerResult.ok
            ? EmailLogLevelEnum.ERROR
            : attempt === 1
                ? EmailLogLevelEnum.SUCCESS
                : EmailLogLevelEnum.WARNING;

        let state: EmailStateEnum;
        let sent_at: Nullable<Date> = null;
        let next_retry_at: Nullable<Date> = null;

        if (mailerResult.ok) {
            state = attempt === 1 ? EmailStateEnum.SENT : EmailStateEnum.WARNING;
            sent_at = new Date();
        } else if (attempt >= maxRetries) {
            state = EmailStateEnum.FAILED;
        } else {
            state = EmailStateEnum.RETRYING;
            next_retry_at = new Date(Date.now() + intervalSeconds * 1000);
        }

        await this._emailSendLogsRepository.create({
            id_email: email.id_email,
            attempt,
            level,
            message: mailerResult.ok && attempt === 1
                ? `Enviado con exito: ${mailerResult.message}`
                : mailerResult.ok
                    ? `Enviado con exito tras reintentos: ${mailerResult.message}`
                    : `Fallo el envio: ${mailerResult.message}`,
            smtp_host: smtpServer.host,
        });

        email.attempts = attempt;
        email.state = state;
        email.sent_at = sent_at;
        email.next_retry_at = next_retry_at;

        const updated = await this._emailsRepository.update(email.id_email, email);
        return updated ?? email;
    };
}
