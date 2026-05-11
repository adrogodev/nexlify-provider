import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { NexlifyConfigurationDto } from "src/core/application/dtos";
import { AddNexlifyConfigurationRequestData, AddNexlifyConfigurationUseCase, GetNexlifyConfigurationUseCase } from "src/core/application/use-cases/nexlify-configuration";
import { ClientResponse } from "src/core/domain/models";
import { AuthGuard } from "src/infrastructure/guards";

@UseGuards(AuthGuard)
@Controller('api/configuration')
export class NexlifyConfigurationController {
    constructor(
        private readonly _addNexlifyConfigurationUseCase: AddNexlifyConfigurationUseCase,
        private readonly _getNexlifyConfigurationUseCase: GetNexlifyConfigurationUseCase
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

    @Get('get')
    @HttpCode(200)
    async get(): Promise<ClientResponse<NexlifyConfigurationDto>> {
        return new ClientResponse({
            ok: true,
            message: 'Configuración obtenida con exito',
            data: await this._getNexlifyConfigurationUseCase.run()
        })
    }
}