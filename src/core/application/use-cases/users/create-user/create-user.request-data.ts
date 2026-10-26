import { Type } from "class-transformer";
import { IsInt, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateUserRequestData {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    id_client?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    id_type?: number;

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
}

export type CreateUserInput = CreateUserRequestData;
