import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { AddSmtpServerRequestData, AddSmtpServerUseCase } from "src/core/application/use-cases/smtp-server";
import { ClientResponse } from "src/core/domain/models";

@Controller('api/smtp-server')
export class SmtpServerController {
    constructor(
        private readonly _addSmtpServer: AddSmtpServerUseCase
    ) { }

    @Post('add')
    @HttpCode(200)
    async add(@Body() body: AddSmtpServerRequestData): Promise<ClientResponse<boolean>> {
        return new ClientResponse({
            ok: false,
            message: 'Servidor smpt agregado con exito',
            data: await this._addSmtpServer.run({ data: { ...body } })
        })
    }
}