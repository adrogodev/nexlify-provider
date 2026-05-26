import { IsNotEmpty, IsString } from "class-validator";

export class AssignCredentialsRequestData {
    @IsNotEmpty()
    @IsString()
    username: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}

export type AssignCredentialsInput = AssignCredentialsRequestData & { assign_creds_token: string };