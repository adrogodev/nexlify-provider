import {
    Body,
    Controller,
    Get,
    Headers,
    HttpCode,
    Ip,
    Post,
    Put,
    Query,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {
    AllClientsInfoDTO,
    AuthDto,
    ClientDataDTO,
    ClientDetailDTO,
    PaginateBaseDTO,
} from 'src/core/application/dtos';
import {
    AssignCredentialsRequestData,
    AssignCredentialsUseCase,
    ClientDataUseCase,
    GetAllClientRequestData,
    GetAllClientsUseCase,
    SignInRequestData,
    SignInUseCase,
} from 'src/core/application/use-cases/clients';
import {
    ClientDetailUseCase,
    GetClientDetailRequestData,
} from 'src/core/application/use-cases/clients/client-detail';
import {
    ForgotPasswordRequestData,
    ForgotPasswordUseCase,
} from 'src/core/application/use-cases/clients/forgot-password';
import {
    RegisterClientRequestData,
    RegisterClientUseCase,
} from 'src/core/application/use-cases/clients/register-client';
import {
    ResetPasswordRequestData,
    ResetPasswordUseCase,
} from 'src/core/application/use-cases/clients/reset-password';
import {
    UpdateClientRequestData,
    UpdateClientUseCase,
} from 'src/core/application/use-cases/clients/update-client';
import {
    UpdateClientStateRequestData,
    UpdateClientStateUseCase,
} from 'src/core/application/use-cases/clients/update-client-state';
import { ClientResponse } from 'src/core/domain/models';
import { AuthGuard, SmtpServerExistsGuard } from 'src/infrastructure/guards';
import { ContextInterceptor } from 'src/infrastructure/interceptors/context.interceptor';

@Controller('api/client')
export class ClientContoller {
    constructor(
        private readonly _registerClientUseCase: RegisterClientUseCase,
        private readonly _assignCredentialsUseCase: AssignCredentialsUseCase,
        private readonly _signInUseCase: SignInUseCase,
        private readonly _getAllClientUseCase: GetAllClientsUseCase,
        private readonly _clientDetailUseCase: ClientDetailUseCase,
        private readonly _clientDataUseCase: ClientDataUseCase,
        private readonly _updateClientUseCase: UpdateClientUseCase,
        private readonly _updateClientStateUseCase: UpdateClientStateUseCase,
        private readonly _forgotPasswordUseCase: ForgotPasswordUseCase,
        private readonly _resetPasswordUseCase: ResetPasswordUseCase,
    ) {}

    @Post('register')
    @HttpCode(200)
    @UseGuards(AuthGuard)
    @UseGuards(SmtpServerExistsGuard)
    async register(
        @Body() body: RegisterClientRequestData,
    ): Promise<ClientResponse<boolean>> {
        return new ClientResponse({
            ok: true,
            message: 'Cliente registrado existosamente',
            data: await this._registerClientUseCase.run({ data: { ...body } }),
        });
    }

    @Post('assign-credentials')
    @HttpCode(200)
    async assignCredetials(
        @Headers('x-assign-creds-token') assign_creds_token: string,
        @Body() body: AssignCredentialsRequestData,
    ): Promise<ClientResponse<boolean>> {
        return new ClientResponse({
            ok: true,
            message: 'Credenciales asignadas exitosamente',
            data: await this._assignCredentialsUseCase.run({
                data: { ...body, assign_creds_token },
            }),
        });
    }

    @Post('sign-in')
    @HttpCode(200)
    async signIn(
        @Ip() ip: string,
        @Body() body: SignInRequestData,
    ): Promise<ClientResponse<AuthDto>> {
        const ip_connection = (ip ?? '').replace('::ffff:', '');
        return new ClientResponse({
            ok: true,
            message: 'Inicio de sesion exitoso',
            data: await this._signInUseCase.run({
                data: { ...body, ip_connection },
            }),
        });
    }

    @Get('get-clients')
    @HttpCode(200)
    @UseGuards(AuthGuard)
    async getClients(
        @Query() query: GetAllClientRequestData,
    ): Promise<ClientResponse<PaginateBaseDTO<AllClientsInfoDTO[]>>> {
        return new ClientResponse({
            ok: true,
            message: 'Informacion de clientes obtenida exitosamente',
            data: await this._getAllClientUseCase.run({ data: { ...query } }),
        });
    }

    @Get('detail')
    @HttpCode(200)
    @UseGuards(AuthGuard)
    async getClientDetail(
        @Query() query: GetClientDetailRequestData,
    ): Promise<ClientResponse<ClientDetailDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Detalle del cliente obtenido exitosamente',
            data: await this._clientDetailUseCase.run({ data: { ...query } }),
        });
    }

    @UseInterceptors(ContextInterceptor)
    @UseGuards(AuthGuard)
    @Get('data')
    @HttpCode(200)
    async clientData(): Promise<ClientResponse<ClientDataDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Datos de sesion obtenidos existosamente',
            data: await this._clientDataUseCase.run({ data: null }),
        });
    }

    @UseInterceptors(ContextInterceptor)
    @UseGuards(AuthGuard)
    @Put('update')
    @HttpCode(200)
    async updateClient(
        @Body() body: UpdateClientRequestData,
    ): Promise<ClientResponse<boolean>> {
        await this._updateClientUseCase.run({ data: { ...body } });
        return new ClientResponse({
            ok: true,
            message: 'Informacion del cliente actualizada exitosamente',
            data: true,
        });
    }

    @UseInterceptors(ContextInterceptor)
    @UseGuards(AuthGuard)
    @Put('state')
    @HttpCode(200)
    async updateClientState(
        @Body() body: UpdateClientStateRequestData,
    ): Promise<ClientResponse<boolean>> {
        await this._updateClientStateUseCase.run({ data: { ...body } });
        return new ClientResponse({
            ok: true,
            message: 'Estado del cliente actualizado exitosamente',
            data: true,
        });
    }

    // Public recovery flow: the response is always generic and never discloses
    // whether the username exists.
    @Post('forgot-password')
    @HttpCode(200)
    async forgotPassword(
        @Body() body: ForgotPasswordRequestData,
    ): Promise<ClientResponse<boolean>> {
        await this._forgotPasswordUseCase.run({ data: { ...body } });
        return new ClientResponse({
            ok: true,
            message: 'Si el usuario existe se enviara un email',
            data: true,
        });
    }

    @Post('reset-password')
    @HttpCode(200)
    async resetPassword(
        @Body() body: ResetPasswordRequestData,
    ): Promise<ClientResponse<boolean>> {
        await this._resetPasswordUseCase.run({ data: { ...body } });
        return new ClientResponse({
            ok: true,
            message: 'Contraseña restablecida exitosamente',
            data: true,
        });
    }
}
