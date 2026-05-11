import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator"

export class AddNexlifyConfigurationRequestData {
    @IsString()
    @IsNotEmpty()
    sender_email: string;

    @IsString()
    @IsNotEmpty()
    sender_name: string;

    @IsOptional()
    @IsString()
    reply_to_email?: string;

    @IsString()
    @IsNotEmpty()
    mail_application_password: string;

    @IsNumber()
    @IsNotEmpty()
    id_smtp_server: number;

    @IsOptional()
    @IsNumber()
    daily_send_limit?: number;

    @IsOptional()
    @IsNumber()
    max_retries?: number;

    @IsOptional()
    @IsNumber()
    retry_interval_seconds?: number;

    @IsOptional()
    @IsString()
    email_header_text?: string;

    @IsOptional()
    @IsString()
    email_header_html?: string;

    @IsOptional()
    @IsString()
    email_header_img_url?: string;

    @IsOptional()
    @IsString()
    email_footer_text?: string;

    @IsOptional()
    @IsString()
    email_footer_html?: string;

    @IsOptional()
    @IsString()
    email_footer_img_url?: string;
}

export type AddNexlifyConfigurationInput = AddNexlifyConfigurationRequestData;