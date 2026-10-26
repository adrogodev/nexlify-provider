import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateClientRequestData {
    /** Admin-only: targets another client; a non-admin caller is refused. */
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    id_client?: number;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    cell_callsign?: string;

    @IsOptional()
    @IsString()
    cell_phone?: string;

    @IsOptional()
    @IsString()
    user_first_name?: string;

    @IsOptional()
    @IsString()
    user_second_name?: string;

    @IsOptional()
    @IsString()
    user_first_surname?: string;

    @IsOptional()
    @IsString()
    user_second_surname?: string;
}

export type UpdateClientInput = UpdateClientRequestData;
