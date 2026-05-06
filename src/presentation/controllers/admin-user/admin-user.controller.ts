import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthAdminUserRequestData } from 'src/core/application/use-cases/admin-user/auth/auth-admin-user.request-data';
import { AuthAdminUserUseCase } from 'src/core/application/use-cases/admin-user/auth/auth-admin-user.usecase';
import { UnauthenticatedException } from 'src/core/domain/exceptions';
import { ClientResponse } from 'src/core/domain/models/client-response.model';

@Controller('admin-user')
export class AdminUserController {
    constructor(private readonly _authUseCase: AuthAdminUserUseCase) {}

    @Post('auth')
    @HttpCode(200)
    async auth(@Body() data: AuthAdminUserRequestData): Promise<ClientResponse<{ token: string }>> {
        const token = await this._authUseCase.run({ data });
        if (!token) throw new UnauthenticatedException();
        return new ClientResponse({ ok: true, message: 'Autenticación exitosa', data: { token } });
    }
}
