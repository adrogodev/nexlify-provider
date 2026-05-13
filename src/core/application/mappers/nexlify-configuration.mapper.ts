import { NexlifyConfiguration } from "src/core/domain/entities/nexlify-configuration.entity";
import { NexlifyConfigurationDto } from "../dtos";
import { SmtpServers } from "src/core/domain/entities/smtp-server.entity";

export class NexlifyConfigurationMapper {
    public static toMap(configuration: Nullable<NexlifyConfiguration>, smtp: Nullable<SmtpServers>): NexlifyConfigurationDto {
        return {
            sender: {
                sender_email: configuration?.sender_email!,
                sender_name: configuration?.sender_name!,
                reply_to_email: configuration?.reply_to_email!,
                mail_application_password: configuration?.mail_application_password!
            },
            smtp: {
                provider: smtp?.provider || null,
                name: smtp?.name || null,
                port: smtp?.port || null
            },
            limits: {
                daily_send_limit: configuration?.daily_send_limit!,
                max_retries: configuration?.max_retries!,
                retry_interval_seconds: configuration?.retry_interval_seconds!
            },
            template: {
                header: {
                    email_header_text: configuration?.email_header_text,
                    email_header_html: configuration?.email_header_html,
                    email_header_img_url: configuration?.email_header_img_url,
                },
                footer: {
                    email_footer_text: configuration?.email_footer_text,
                    email_footer_html: configuration?.email_footer_html,
                    email_footer_img_url: configuration?.email_footer_img_url,
                }
            }
        }
    }
}