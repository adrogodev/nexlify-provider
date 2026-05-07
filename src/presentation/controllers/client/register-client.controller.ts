import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { RegisterClientRequestData, RegisterClientUseCase } from "src/core/application/use-cases/clients/register-client";
import { ClientResponse } from "src/core/domain/models";
import { AuthGuard } from "src/infrastructure/guards";

@UseGuards(AuthGuard)
@Controller('api/client')
export class ClientContoller {
    constructor(
        private readonly _registerClientUseCase: RegisterClientUseCase
    ) { }

    @Post('register')
    @HttpCode(200)
    async register(@Body() body: RegisterClientRequestData): Promise<ClientResponse<boolean>> {
        return new ClientResponse({
            ok: true,
            message: 'Cliente registrado existosamente',
            data: await this._registerClientUseCase.run({ data: { ...body } })
        });
    }
}