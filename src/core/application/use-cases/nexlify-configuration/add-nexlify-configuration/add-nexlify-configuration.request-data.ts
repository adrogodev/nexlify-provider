import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator"

export class AddNexlifyConfigurationRequestData {
    @IsString()
    @IsNotEmpty()
    sender_email: string;

    @IsString()
    @IsNotEmpty()
    sender_name: string;

    @IsString()
    @IsOptional()
    reply_to_email?: string;

    @IsString()
    @IsNotEmpty()
    mail_application_password: string;

    @IsNumber()
    @IsOptional()
    id_smtp_server?: number;

    @IsString()
    @IsOptional()
    client_id?: string;

    @IsString()
    @IsOptional()
    client_secret?: string;

    @IsString()
    @IsOptional()
    tenant_id?: string;

    @IsString()
    @IsOptional()
    refresh_token?: string;

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

export type AddNexlifyConfigurationInput = AddNexlifyConfigurationRequestData;