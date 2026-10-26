import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional } from "class-validator";
import { ClientStateEnum } from "src/core/domain/enum";

export class UpdateClientStateRequestData {
    @Type(() => Number)
    @IsNumber()
    id_client: number;

    /** Target client state; must be a ClientStateEnum value (validated by the request pipe). */
    @Type(() => Number)
    @IsNumber()
    @IsEnum(ClientStateEnum)
    id_client_state: number;
}

export type UpdateClientStateInput = UpdateClientStateRequestData & { id_client_state: number };
