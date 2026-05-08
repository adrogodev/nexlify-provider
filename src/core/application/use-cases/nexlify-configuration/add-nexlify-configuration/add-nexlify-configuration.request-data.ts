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
    reply_to_email: Nullable<string>;

    @IsString()
    @IsNotEmpty()
    mail_application_password: string;

    @IsOptional()
    @IsNumber()
    id_smtp_server: number;

    @IsOptional()
    @IsNumber()
    daily_send_limit: Nullable<number>;

    @IsOptional()
    @IsNumber()
    max_retries: Nullable<number>;

    @IsOptional()
    @IsNumber()
    retry_interval_seconds: Nullable<number>;

    @IsOptional()
    @IsString()
    email_header_text: Nullable<string>;

    @IsOptional()
    @IsString()
    email_header_html: Nullable<string>;

    @IsOptional()
    @IsString()
    email_header_img_url: Nullable<string>;

    @IsOptional()
    @IsString()
    email_footer_text: Nullable<string>;

    @IsOptional()
    @IsString()
    email_footer_html: Nullable<string>;

    @IsOptional()
    @IsString()
    email_footer_img_url: Nullable<string>;
}

export type AddNexlifyConfigurationInput = AddNexlifyConfigurationRequestData;