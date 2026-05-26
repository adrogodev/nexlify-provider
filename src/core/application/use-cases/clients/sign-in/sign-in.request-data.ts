import { IsNotEmpty, IsString } from "class-validator";

export class SignInRequestData {
    @IsNotEmpty()
    @IsString()
    username: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}

export type SignInInput = SignInRequestData & { ip_connection: string }