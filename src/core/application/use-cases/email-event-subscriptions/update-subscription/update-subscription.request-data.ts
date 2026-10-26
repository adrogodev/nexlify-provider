import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { EmailEventEnum } from 'src/core/domain/enum';

export class SubscriptionUuidParam {
    /** The email_event_subscriptions table key is a DB-side uuid. */
    @IsUUID(4)
    subscriptionUuid: string;
}

export class UpdateSubscriptionRequestData {
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @IsEnum(EmailEventEnum, { each: true })
    events?: EmailEventEnum[];

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

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}

export type UpdateSubscriptionInput = UpdateSubscriptionRequestData & { subscription_uuid: string };
