import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { EmailEventEnum } from 'src/core/domain/enum';

export class CreateSubscriptionRequestData {
    /** The subscription must point to an OWN active webhook endpoint (or admin any). */
    @IsString()
    @IsUUID(4)
    webhook_endpoint_uuid: string;

    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    @IsEnum(EmailEventEnum, { each: true })
    events: EmailEventEnum[];

    @IsOptional()
    @IsBoolean()
    include_body?: boolean;

    @IsOptional()
    @IsBoolean()
    include_dates?: boolean;

    @IsOptional()
    @IsBoolean()
    include_sender?: boolean;

    @IsOptional()
    @IsBoolean()
    include_recipients?: boolean;

    @IsOptional()
    @IsBoolean()
    include_attachments?: boolean;

    /** Administration flow: subscribe events for another client. */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    id_client?: number;
}

export type CreateSubscriptionInput = CreateSubscriptionRequestData;
