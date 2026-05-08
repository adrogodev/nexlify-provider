import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { AddNexlifyConfigurationInput, AddNexlifyConfigurationRequestData } from "./add-nexlify-configuration.request-data";
import { INexlifyConfigurationRepository } from "src/core/application/contracts/persistence";

export class AddNexlifyConfigurationUseCase implements UseCase<AddNexlifyConfigurationInput, boolean> {
    constructor(
        private readonly _nexlifyConfigurationRepository: INexlifyConfigurationRepository
    ) { }

    public run = async (args: UseCaseArgs<AddNexlifyConfigurationRequestData>): Promise<boolean> => {
        const { ...values } = args.data;

        await this._nexlifyConfigurationRepository.create({
            sender_email: values.sender_email,
            sender_name: values.sender_name,
            reply_to_email: values.reply_to_email,
            mail_application_password: values.mail_application_password,
            id_smtp_server: BigInt(values.id_smtp_server),
            daily_send_limit: values.daily_send_limit,
            max_retries: values.max_retries,
            retry_interval_seconds: values.retry_interval_seconds,
            email_header_text: values.email_header_text,
            email_header_html: values.email_header_html,
            email_header_img_url: values.email_header_img_url,
            email_footer_text: values.email_footer_text,
            email_footer_html: values.email_footer_html,
            email_footer_img_url: values.email_footer_img_url,
        })

        return true;
    };
}