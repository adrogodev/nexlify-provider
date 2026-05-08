import { Body, Controller, HttpCode, Ip, Post } from '@nestjs/common';
import { AuthDto } from 'src/core/application/dtos';
import { AuthAdminUserRequestData, AuthAdminUserUseCase } from 'src/core/application/use-cases/admin-user/auth';
import { ClientResponse } from 'src/core/domain/models';

@Controller('api/admin-user')
export class AdminUserController {
    constructor(private readonly _authUseCase: AuthAdminUserUseCase) { }

    @Post('auth')
    @HttpCode(200)
    async auth(@Ip() ip: string, @Body() body: AuthAdminUserRequestData): Promise<ClientResponse<AuthDto>> {

        const ip_connection = (ip ?? '').replace('::ffff:', '');
        const data = await this._authUseCase.run({ data: { ...body, ip_connection } });

        return new ClientResponse({
            ok: true,
            message: 'Inicio de sesion exitoso',
            data
        });
    }
}
