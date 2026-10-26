import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUrl } from 'class-validator';

export class RegisterWebhookEndpointRequestData {
    @IsUrl()
    url: string;

    /** Administration flow: register the endpoint for another client. */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    id_client?: number;
}

export type RegisterWebhookEndpointInput = RegisterWebhookEndpointRequestData;
