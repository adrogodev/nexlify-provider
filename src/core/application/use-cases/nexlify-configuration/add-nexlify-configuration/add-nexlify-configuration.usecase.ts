import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { AddNexlifyConfigurationInput, AddNexlifyConfigurationRequestData } from "./add-nexlify-configuration.request-data";
import { INexlifyConfigurationRepository } from "src/core/application/contracts/persistence";
import { normalize } from "src/infrastructure/tools/normalize.tool";
import { NexlifyConfiguration } from "src/core/domain/entities/nexlify-configuration.entity";
import { AlreadyExistsException, NotFoundException } from "src/core/domain/exceptions";

export class AddNexlifyConfigurationUseCase implements UseCase<AddNexlifyConfigurationInput, boolean> {
    constructor(
        private readonly _nexlifyConfigurationRepository: INexlifyConfigurationRepository
    ) { }

    public run = async (args: UseCaseArgs<AddNexlifyConfigurationRequestData>): Promise<boolean> => {
        const { ...values } = args.data;

        const configuration: Nullable<NexlifyConfiguration> = await this._nexlifyConfigurationRepository.findConfiguration();

        if (configuration !== null) throw new AlreadyExistsException("Ya se ha realizado la configuración para esta cuenta");

        await this._nexlifyConfigurationRepository.create({
            sender_email: values.sender_email,
            sender_name: values.sender_name,
            reply_to_email: normalize(values.reply_to_email),
            mail_application_password: values.mail_application_password,
            id_smtp_server: values.id_smtp_server !== undefined ? BigInt(values.id_smtp_server) : null,
            daily_send_limit: normalize(values.daily_send_limit),
            max_retries: normalize(values.max_retries),
            retry_interval_seconds: normalize(values.retry_interval_seconds),
            email_header_text: normalize(values.email_header_text),
            email_header_html: normalize(values.email_header_html),
            email_header_img_url: normalize(values.email_header_img_url),
            email_footer_text: normalize(values.email_footer_text),
            email_footer_html: normalize(values.email_footer_html),
            email_footer_img_url: normalize(values.email_footer_img_url),
        });

        return true;
    };
}