import type { INexlifyConfigurationRepository, ISmtpServerRepository } from "src/core/application/contracts/persistence";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { SendEmailInput, SendEmailRequestData } from "./send-email.request-data";
import type { IMailerService, MailerPayload } from "src/core/application/contracts/services";

export class SendEmailUseCase implements UseCase<SendEmailInput, boolean> {
    constructor(
        private readonly _nexlifyConfigurationRepository: INexlifyConfigurationRepository,
        private readonly _smtpServerRepository: ISmtpServerRepository,
        private readonly _mailerService: IMailerService
    ) { }

    public run = async (args: UseCaseArgs<SendEmailInput>): Promise<boolean> => {
        const { ...values } = args.data;

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

        const mailerPayload: MailerPayload = {
            transporter: {
                host: smtpServer.host ?? '',
                port: smtpServer.port ?? 587,
                secure: smtpServer.port === 465,
                user: configuration.sender_email,
                password: configuration.mail_application_password ?? ''
            },
            email: {
                from: values.from,
                to: values.to,
                subject: values.subject,
                html: values.html,
                text: values.text,
                attachments: values.attachments,
            }
        }

        return await this._mailerService.send(mailerPayload);
    };
}