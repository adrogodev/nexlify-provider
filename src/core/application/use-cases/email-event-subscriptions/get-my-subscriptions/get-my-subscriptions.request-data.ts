import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class GetMySubscriptionsRequestData {
    /**
     * The own listing opens to admins; only an admin request with an explicit
     * id_client narrows the listing to that client.
     */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    id_client?: number;
}

export type GetMySubscriptionsInput = GetMySubscriptionsRequestData | null;
