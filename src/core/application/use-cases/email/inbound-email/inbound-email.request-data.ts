import 'reflect-metadata';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsInt, IsNotEmpty, IsOptional, IsString, Length, Min, ValidateNested } from 'class-validator';

/**
 * Canonical provider-agnostic inbound payload (NOT the HTTP layer). The
 * controller already verified the HMAC signature over the raw bytes; this
 * class only shapes the parsed body. `contentType`/`size`/`content` follow the
 * canonical contract; undeliverable/unknown fields are rejected by the global
 * ValidationPipe (whitelist).
 */
export class InboundAttachmentRequestData {
    @IsString()
    @IsNotEmpty()
    @Length(1, 255)
    filename: string;

    @IsOptional()
    @IsString()
    @Length(1, 100)
    contentType?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    size?: number;

    /** Base64 of the attachment; may be absent for metadata-only notifications. */
    @IsOptional()
    @IsString()
    content?: string;
}

export class InboundEmailRequestData {
    @IsString()
    @IsNotEmpty()
    @Length(1, 255)
    sender: string;

    @IsOptional()
    @IsString()
    @Length(1, 255)
    message_id?: string;

    @IsOptional()
    @IsString()
    @Length(1, 255)
    in_reply_to_message_id?: string;

    @IsOptional()
    @IsString()
    references?: string;

    @IsOptional()
    @IsString()
    subject?: string;

    @IsOptional()
    @IsString()
    body_text?: string;

    @IsOptional()
    @IsString()
    body_html?: string;

    /** When the provider received the reply; carried into the row's created_at (or now). */
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    received_at?: Date;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InboundAttachmentRequestData)
    attachments?: InboundAttachmentRequestData[];
}

export type InboundEmailInput = InboundEmailRequestData;
