import { Type } from "class-transformer";
import { IsEnum, IsInt, IsNumber, IsOptional } from "class-validator";
import { ClientStateEnum } from "src/core/domain/enum";

export class UpdateClientStateRequestData {
    @Type(() => Number)
    @IsNumber()
    id_client: number;

    /** Must be a ClientStateEnum value; the membership is validated by the request pipe. */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @IsEnum(ClientStateEnum)
    id_client_state?: number;
}

export type UpdateClientStateInput = UpdateClientStateRequestData & { id_client_state: number };
