import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class GetClientDetailRequestData {
    @Type(() => Number)
    @IsNumber()
    id_client: number;
}
