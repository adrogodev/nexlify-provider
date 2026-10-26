import type { IEmailsRepository } from "src/core/application/contracts/persistence";
import { INexlifyConfigurationRepository } from "src/core/application/contracts/persistence";
import { IIdGenerator } from "src/core/application/contracts/infrastructure";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { SendEmailInput } from "./send-email.request-data";
import { SendEmailResultDTO } from "src/core/application/dtos";
import { EmailAttemptService } from "../services/email-attempt.service";
import { EmailStateEnum } from "src/core/domain/enum";

export class SendEmailUseCase implements UseCase<SendEmailInput, SendEmailResultDTO> {
    constructor(
        private readonly _nexlifyConfigurationRepository: INexlifyConfigurationRepository,
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _attemptService: EmailAttemptService,
        private readonly _idGenerator: IIdGenerator,
    ) { }

    public run = async (args: UseCaseArgs<SendEmailInput>): Promise<SendEmailResultDTO> => {
        const { ...values } = args.data;

        const configuration = await this._nexlifyConfigurationRepository.findConfiguration();
        if (configuration === null) {
            throw new Error('No se ha realizado la configuración para el uso de la plataforma');
        }

        const sendLimit = configuration.daily_send_limit;
        if (sendLimit !== null && sendLimit !== undefined) {
            const now = new Date();
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);
            const sentToday = await this._emailsRepository.countSentOn(startOfDay, now);
            if (sentToday >= sendLimit) {
                throw new Error(`Limite diario de envio alcanzado (${sendLimit})`);
            }
        }

        const persisted = await this._emailsRepository.create({
            email_uuid: this._idGenerator.generateUuid(),
            short_code: this._idGenerator.generateShortCode(),
            id_client: null,
            from_email: values.from,
            to_email: Array.isArray(values.to) ? values.to.join(',') : values.to,
            subject: values.subject,
            body_html: values.html ?? null,
            body_text: values.text ?? null,
            state: EmailStateEnum.QUEUED,
            attempts: 0,
            next_retry_at: null,
            sent_at: null,
        });

        const attempted = await this._attemptService.attempt(persisted.id_email);

        return {
            email_uuid: persisted.email_uuid,
            short_code: persisted.short_code,
            state: attempted.state ?? EmailStateEnum.FAILED,
            attempts: attempted.attempts ?? 0,
        };
    };
}
