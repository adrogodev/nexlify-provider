import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { AddNexlifyConfigurationRequestData, AddNexlifyConfigurationUseCase } from "src/core/application/use-cases/nexlify-configuration";

import { ClientResponse } from "src/core/domain/models";
import { AuthGuard } from "src/infrastructure/guards";

@UseGuards(AuthGuard)
@Controller('api/nexlify-configuration')
export class NexlifyConfigurationController {
    constructor(
        private readonly _addNexlifyConfigurationUseCase: AddNexlifyConfigurationUseCase
    ) { }

    @Post('add')
    @HttpCode(200)
    async add(@Body() body: AddNexlifyConfigurationRequestData): Promise<ClientResponse<boolean>> {
        return new ClientResponse({
            ok: true,
            message: 'Configuración exitosa',
            data: await this._addNexlifyConfigurationUseCase.run({ data: { ...body } })
        })
    }
}