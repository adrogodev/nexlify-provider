import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { SendEmailRequestData } from "src/core/application/use-cases/email/send-email/send-email.request-data";
import { SendEmailUseCase } from "src/core/application/use-cases/email/send-email/send-email.usecase";
import { ClientResponse } from "src/core/domain/models";
import { AuthGuard, ConfigurationExistsGuard } from "src/infrastructure/guards";

@UseGuards(AuthGuard, ConfigurationExistsGuard)
@Controller('api/email')
export class EmailController {
    constructor(
        private readonly _sendEmailUseCase: SendEmailUseCase
    ) { }

    @Post('send')
    @HttpCode(200)
    async send(@Body() body: SendEmailRequestData): Promise<ClientResponse<boolean>> {
        return new ClientResponse({
            ok: true,
            message: 'Correo enviado con exito',
            data: await this._sendEmailUseCase.run({ data: { ...body } })
        })
    }
}