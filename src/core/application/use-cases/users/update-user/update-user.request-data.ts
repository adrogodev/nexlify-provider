import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

export class UserIdParam {
    @Type(() => Number)
    @IsInt()
    id_user: number;
}

export class UpdateUserRequestData {
    @IsOptional()
    @IsString()
    id_number?: string;

    @IsOptional()
    @IsString()
    first_name?: string;

    @IsOptional()
    @IsString()
    second_name?: string;

    @IsOptional()
    @IsString()
    first_surname?: string;

    @IsOptional()
    @IsString()
    second_surname?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    cell_callsign?: string;

    @IsOptional()
    @IsString()
    cell_phone?: string;

    /** ISO date string; the users table stores it as a date column. */
    @IsOptional()
    @IsString()
    birthdate?: string;

    /** State toggle of the user. */
    @IsOptional()
    @IsBoolean()
    state?: boolean;
}

export type UpdateUserInput = UpdateUserRequestData & { id_user: bigint };
