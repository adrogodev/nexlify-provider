import { IsBoolean, IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';

export class WebhookEndpointUuidParam {
    /** The webhook_endpoints table key is a DB-side uuid. */
    @IsUUID(4)
    endpointUuid: string;
}

export class UpdateWebhookEndpointRequestData {
    @IsOptional()
    @IsUrl()
    url?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}

export type UpdateWebhookEndpointInput = UpdateWebhookEndpointRequestData & { endpoint_uuid: string };
