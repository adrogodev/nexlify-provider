import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class AddSmtpServerRequestData {
    @IsString()
    @IsNotEmpty()
    provider: string;

    @IsString()
    @IsNotEmpty()
    host: string;

    @IsNumber()
    @IsNotEmpty()
    port: number
}

export type AddSmtpServerInput = AddSmtpServerRequestData;