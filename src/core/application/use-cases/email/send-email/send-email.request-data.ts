import { Type } from 'class-transformer';
import {
    IsArray,
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import type { EmailAttachment, EmailPayload } from 'src/core/domain/models';

export class EmailAttachmentValidation implements EmailAttachment {
    @IsOptional()
    @IsString()
    filename?: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsString()
    path?: string;

    @IsOptional()
    @IsString()
    contentType?: string;

    @IsOptional()
    @IsString()
    encoding?: string;

    @IsOptional()
    @IsString()
    cid?: string;
}

export class SendEmailRequestData implements EmailPayload {
    @IsEmail()
    @IsNotEmpty()
    from: string;

    @IsNotEmpty()
    @IsEmail({}, { each: true })
    to: string | string[];

    @IsString()
    @IsNotEmpty()
    subject: string;

    @IsOptional()
    @IsString()
    html?: string;

    @IsOptional()
    @IsString()
    text?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EmailAttachmentValidation)
    attachments?: EmailAttachmentValidation[];
}

export type SendEmailInput = SendEmailRequestData;
