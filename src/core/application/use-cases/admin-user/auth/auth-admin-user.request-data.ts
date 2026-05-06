import { IsNotEmpty, IsString } from 'class-validator';

export class AuthAdminUserRequestData {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
