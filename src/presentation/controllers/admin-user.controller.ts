import { Body, Controller, Get, HttpCode, Ip, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthDto, UserDataDTO } from 'src/core/application/dtos';
import { AuthAdminUserRequestData, AuthAdminUserUseCase, UserDataUseCase } from 'src/core/application/use-cases/admin-user';
import { AuthGuard } from 'src/infrastructure/guards';
import { ContextInterceptor } from 'src/infrastructure/interceptors/context.interceptor';
import { ClientResponse } from 'src/core/domain/models';

@UseInterceptors(ContextInterceptor)
@Controller('api/admin-user')
export class AdminUserController {
    constructor(
        private readonly _authUseCase: AuthAdminUserUseCase,
        private readonly _userDataUseCase: UserDataUseCase,
    ) { }

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

    @UseGuards(AuthGuard)
    @Get('data')
    @HttpCode(200)
    async userData(): Promise<ClientResponse<UserDataDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Datos de sesion obtenidos exitosamente',
            data: await this._userDataUseCase.run({ data: null })
        });
    }
}
