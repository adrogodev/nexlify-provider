import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateNexlifyConfigurationRequestData {
    @IsString()
    @IsOptional()
    sender_email?: string;

    @IsString()
    @IsOptional()
    sender_name?: string;

    @IsString()
    @IsOptional()
    reply_to_email?: string;

    @IsString()
    @IsOptional()
    mail_application_password?: string;

    @IsNumber()
    @IsOptional()
    id_smtp_server?: number;

    @IsNumber()
    @IsOptional()
    daily_send_limit?: number;

    @IsNumber()
    @IsOptional()
    max_retries?: number;

    @IsNumber()
    @IsOptional()
    retry_interval_seconds?: number;

    @IsString()
    @IsOptional()
    email_header_text?: string;

    @IsString()
    @IsOptional()
    email_header_html?: string;

    @IsString()
    @IsOptional()
    email_header_img_url?: string;

    @IsString()
    @IsOptional()
    email_footer_text?: string;

    @IsString()
    @IsOptional()
    email_footer_html?: string;

    @IsString()
    @IsOptional()
    email_footer_img_url?: string;
}

export type UpdateNexlifyConfigurationInput = UpdateNexlifyConfigurationRequestData;