import type { IEmailsRepository, INexlifyConfigurationRepository } from "src/core/application/contracts/persistence";
import { IIdGenerator } from "src/core/application/contracts/infrastructure";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { ActionNotAllowedException } from "src/core/domain/exceptions";
import { EmailStateEnum } from "src/core/domain/enum";
import { DiffuseEmailInput } from "../email.request-data";

export interface DiffuseEmailResultDTO {
    queued: number;
    short_codes: string[];
}

/**
 * Diffusion masiva: persists one QUEUED email per recipient, respecting the
 * remaining daily budget, without any immediate send attempt (the scheduled
 * `RetryDueEmailsUseCase` tick sends them later).
 */
export class DiffuseEmailUseCase implements UseCase<DiffuseEmailInput, DiffuseEmailResultDTO> {
    constructor(
        private readonly _nexlifyConfigurationRepository: INexlifyConfigurationRepository,
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _idGenerator: IIdGenerator,
    ) { }

    public run = async (args: UseCaseArgs<DiffuseEmailInput>): Promise<DiffuseEmailResultDTO> => {
        const { to, subject, html, text } = args.data;

        const configuration = await this._nexlifyConfigurationRepository.findConfiguration();
        if (configuration === null) {
            throw new Error('No se ha realizado la configuración para el uso de la plataforma');
        }

        const remainingBudget = await this.#remainingDailyBudget(configuration.daily_send_limit);
        if (remainingBudget !== null && to.length > remainingBudget) {
            throw new ActionNotAllowedException(
                `El presupuesto diario de envio restante (${remainingBudget}) no alcanza para la cantidad solicitada (${to.length})`
            );
        }

        const shortCodes: string[] = [];
        for (const recipient of to) {
            const persisted = await this._emailsRepository.create({
                short_code: this._idGenerator.generateShortCode(),
                id_client: null,
                from_email: configuration.sender_email,
                to_email: recipient,
                subject,
                body_html: html ?? null,
                body_text: text ?? null,
                state: EmailStateEnum.QUEUED,
                attempts: 0,
                next_retry_at: null,
                sent_at: null,
            });
            shortCodes.push(persisted.short_code);
        }

        return {
            queued: shortCodes.length,
            short_codes: shortCodes,
        };
    };

    async #remainingDailyBudget(dailySendLimit: Nullable<number>): Promise<number | null> {
        if (dailySendLimit === null || dailySendLimit === undefined) return null;

        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const sentToday = await this._emailsRepository.countSentOn(startOfDay, now);

        return Math.max(0, dailySendLimit - sentToday);
    }
}
