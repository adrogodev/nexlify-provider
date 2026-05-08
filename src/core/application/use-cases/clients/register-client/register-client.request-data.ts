import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class RegisterClientRequestData {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    cell_callsign: string;

    @IsString()
    @IsNotEmpty()
    cell_phone: string;

    @IsString()
    @IsNotEmpty()
    user_first_name: string;

    @IsOptional()
    @IsString()
    user_second_name?: string;

    @IsString()
    @IsNotEmpty()
    user_first_surname: string;

    @IsOptional()
    @IsString()
    user_second_surname?: string;

}

export type RegisterClientInput = RegisterClientRequestData;