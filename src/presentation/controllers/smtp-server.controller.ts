import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { AddSmtpServerRequestData, AddSmtpServerUseCase } from "src/core/application/use-cases/smtp-server";
import { ClientResponse } from "src/core/domain/models";
import { AuthGuard } from "src/infrastructure/guards";

@UseGuards(AuthGuard)
@Controller('api/smtp-server')
export class SmtpServerController {
    constructor(
        private readonly _addSmtpServer: AddSmtpServerUseCase
    ) { }

    @Post('add')
    @HttpCode(200)
    async add(@Body() body: AddSmtpServerRequestData): Promise<ClientResponse<boolean>> {
        return new ClientResponse({
            ok: true,
            message: 'Servidor smpt agregado con exito',
            data: await this._addSmtpServer.run({ data: { ...body } })
        })
    }
}