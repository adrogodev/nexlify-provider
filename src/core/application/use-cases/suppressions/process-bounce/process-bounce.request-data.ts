import {
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export enum BounceType {
    HARD_BOUNCE = 'HARD_BOUNCE',
    SOFT_BOUNCE = 'SOFT_BOUNCE',
    COMPLAINT = 'COMPLAINT',
}

export class ProcessBounceRequestData {
    @IsEmail()
    recipient: string;

    @IsEnum(BounceType)
    type: BounceType;

    /** SMTP Message-ID of the original email (threading key). */
    @IsOptional()
    @IsString()
    message_id?: string;

    /** Public uuid of the original email (takes precedence over message_id). */
    @IsOptional()
    @IsString()
    email_uuid?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}

export type ProcessBounceInput = ProcessBounceRequestData;
