import { Body, Controller, Get, Headers, HttpCode, Ip, Post, Query, UseGuards } from "@nestjs/common";
import { AllClientsInfoDTO, AuthDto, PaginateBaseDTO } from "src/core/application/dtos";
import { AssignCredentialsRequestData, AssignCredentialsUseCase, GetAllClientRequestData, GetAllClientsUseCase, SignInRequestData, SignInUseCase } from "src/core/application/use-cases/clients";
import { RegisterClientRequestData, RegisterClientUseCase } from "src/core/application/use-cases/clients/register-client";
import { ClientResponse } from "src/core/domain/models";
import { AuthGuard, SmtpServerExistsGuard } from "src/infrastructure/guards";

@Controller('api/client')
export class ClientContoller {
    constructor(
        private readonly _registerClientUseCase: RegisterClientUseCase,
        private readonly _assignCredentialsUseCase: AssignCredentialsUseCase,
        private readonly _signInUseCase: SignInUseCase,
        private readonly _getAllClientUseCase: GetAllClientsUseCase
    ) { }

    @Post('register')
    @HttpCode(200)
    @UseGuards(AuthGuard)
    @UseGuards(SmtpServerExistsGuard)
    async register(@Body() body: RegisterClientRequestData): Promise<ClientResponse<boolean>> {
        return new ClientResponse({
            ok: true,
            message: 'Cliente registrado existosamente',
            data: await this._registerClientUseCase.run({ data: { ...body } })
        });
    }

    @Post('assign-credentials')
    @HttpCode(200)
    async assignCredetials(@Headers('x-assign-token') assign_creds_token: string, @Body() body: AssignCredentialsRequestData): Promise<ClientResponse<boolean>> {
        return new ClientResponse({
            ok: true,
            message: 'Credenciales asignadas exitosamente',
            data: await this._assignCredentialsUseCase.run({ data: { ...body, assign_creds_token } })
        })
    }

    @Post('sign-in')
    @HttpCode(200)
    async signIn(@Ip() ip: string, @Body() body: SignInRequestData): Promise<ClientResponse<AuthDto>> {

        const ip_connection = (ip ?? '').replace('::ffff:', '');
        return new ClientResponse({
            ok: true,
            message: 'Inicio de sesion exitoso',
            data: await this._signInUseCase.run({ data: { ...body, ip_connection } })
        })
    }

    @Get('get-clients')
    @HttpCode(200)
    @UseGuards(AuthGuard)
    async getClients(@Query() query: GetAllClientRequestData): Promise<ClientResponse<PaginateBaseDTO<AllClientsInfoDTO[]>>> {
        return new ClientResponse({
            ok: true,
            message: 'Informacion de clientes obtenida exitosamente',
            data: await this._getAllClientUseCase.run({ data: { ...query } })
        })
    }
}