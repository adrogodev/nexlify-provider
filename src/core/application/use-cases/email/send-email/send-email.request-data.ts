import { Type } from 'class-transformer';
import {
    IsArray,
    IsEmail,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    ValidateIf,
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

export class SendEmailRequestData implements Omit<EmailPayload, 'subject'> {
    @IsEmail()
    @IsNotEmpty()
    from: string;

    @IsNotEmpty()
    @IsEmail({}, { each: true })
    to: string | string[];

    /** Optional when `id_template` is given (the template subject is used). */
    @ValidateIf((o: SendEmailRequestData) => !o.id_template || o.subject !== undefined)
    @IsString()
    @IsNotEmpty()
    subject?: string;

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

    /** S2: render subject/body from a stored template (explicit values override it). */
    @IsOptional()
    @IsUUID()
    id_template?: string;

    /** S2: values for the template `{{placeholders}}`. */
    @IsOptional()
    @IsObject()
    variables?: Record<string, string>;
}

export type SendEmailInput = SendEmailRequestData;
