import { IsNotEmpty, IsString } from 'class-validator';

export class AuthAdminUserRequestData {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}

export type AuthAdminUserInput = AuthAdminUserRequestData & { ip_connection: string };
