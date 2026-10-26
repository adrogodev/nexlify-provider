import { IsNotEmpty, IsString } from "class-validator";

export class ForgotPasswordRequestData {
    @IsNotEmpty()
    @IsString()
    username: string;
}

export type ForgotPasswordInput = ForgotPasswordRequestData;
