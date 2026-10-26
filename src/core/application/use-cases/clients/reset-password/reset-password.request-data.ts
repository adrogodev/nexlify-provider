import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPasswordRequestData {
    /** The ENCRYPTED recovery token, exactly as it was emailed and stored. */
    @IsNotEmpty()
    @IsString()
    recovery_token: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    password: string;
}

export type ResetPasswordInput = ResetPasswordRequestData;
