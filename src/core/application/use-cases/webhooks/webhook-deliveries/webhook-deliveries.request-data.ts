import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class ListWebhookDeliveriesRequestData {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;
}

export type ListWebhookDeliveriesInput = ListWebhookDeliveriesRequestData & {
    endpoint_uuid: string;
};

export class WebhookDeliveryIdParam {
    /** webhook_deliveries.id_delivery (bigint, sent as a decimal string). */
    @Matches(/^[1-9]\d{0,18}$/, {
        message: 'deliveryId debe ser un identificador numerico',
    })
    deliveryId: string;
}
