import { INexlifyConfigurationRepository } from "src/core/application/contracts/persistence";
import type { EntityUpdateInput } from "src/core/application/contracts/persistence/base.repository";
import { NexlifyConfiguration } from "src/core/domain/entities/nexlify-configuration.entity";
import { NotFoundException } from "src/core/domain/exceptions";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { normalize } from "src/core/application/tools/normalize.tool";
import { UpdateNexlifyConfigurationInput, UpdateNexlifyConfigurationRequestData } from "./update-nexlify-configuration.request-data";

export class UpdateNexlifyConfigurationUseCase implements UseCase<UpdateNexlifyConfigurationInput, boolean> {
    constructor(
        private readonly _nexlifyConfigurationRepository: INexlifyConfigurationRepository
    ) { }

    public run = async (args: UseCaseArgs<UpdateNexlifyConfigurationRequestData>): Promise<boolean> => {
        const { ...values } = args.data;

        const configuration: Nullable<NexlifyConfiguration> = await this._nexlifyConfigurationRepository.findConfiguration();
        if (configuration === null) throw new NotFoundException("Configuración no encontrada");

        const updateData: EntityUpdateInput<NexlifyConfiguration, 'id_configuration'> = {
            sender_email: values.sender_email ?? configuration.sender_email,
            sender_name: values.sender_name ?? configuration.sender_name,
            reply_to_email: normalize(values.reply_to_email) ?? configuration.reply_to_email,
            mail_application_password: values.mail_application_password ?? configuration.mail_application_password,
            id_smtp_server: values.id_smtp_server !== undefined ? BigInt(values.id_smtp_server) : configuration.id_smtp_server,
            daily_send_limit: normalize(values.daily_send_limit) ?? configuration.daily_send_limit,
            max_retries: normalize(values.max_retries) ?? configuration.max_retries,
            retry_interval_seconds: normalize(values.retry_interval_seconds) ?? configuration.retry_interval_seconds,
            email_header_text: normalize(values.email_header_text) ?? configuration.email_header_text,
            email_header_html: normalize(values.email_header_html) ?? configuration.email_header_html,
            email_header_img_url: normalize(values.email_header_img_url) ?? configuration.email_header_img_url,
            email_footer_text: normalize(values.email_footer_text) ?? configuration.email_footer_text,
            email_footer_html: normalize(values.email_footer_html) ?? configuration.email_footer_html,
            email_footer_img_url: normalize(values.email_footer_img_url) ?? configuration.email_footer_img_url,
        };

        await this._nexlifyConfigurationRepository.update(configuration.id_configuration, updateData);

        return true;
    };
}