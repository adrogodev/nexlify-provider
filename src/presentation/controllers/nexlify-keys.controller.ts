import { Body, Controller, Get, HttpCode, Param, Post, Put, UseGuards } from "@nestjs/common";
import { OwnedNexlifyKeyDTO } from "src/core/application/use-cases/nexlify-keys/list-my-nexlify-keys.usecase";
import { GenerateNexlifyKeyUseCase, GeneratedNexlifyKeyDTO, ListMyNexlifyKeysUseCase } from "src/core/application/use-cases/nexlify-keys";
import { RevokeNexlifyKeyUseCase } from "src/core/application/use-cases/nexlify-keys/revoke-nexlify-key.usecase";
import { ClientResponse } from "src/core/domain/models";
import { AuthGuard } from "src/infrastructure/guards";

@UseGuards(AuthGuard)
@Controller('api/nexlify-keys')
export class NexlifyKeysController {
    constructor(
        private readonly _generateNexlifyKeyUseCase: GenerateNexlifyKeyUseCase,
        private readonly _listMyNexlifyKeysUseCase: ListMyNexlifyKeysUseCase,
        private readonly _revokeNexlifyKeyUseCase: RevokeNexlifyKeyUseCase,
    ) { }

    @Post('generate')
    @HttpCode(200)
    async generate(@Body() body: { id_client?: number }): Promise<ClientResponse<GeneratedNexlifyKeyDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Clave API generada con exito. Guarlala con seguridad: no se volvera a mostrar',
            data: await this._generateNexlifyKeyUseCase.run({ data: { ...body } })
        })
    }

    @Get('my')
    @HttpCode(200)
    async myKeys(): Promise<ClientResponse<OwnedNexlifyKeyDTO[]>> {
        return new ClientResponse({
            ok: true,
            message: 'Claves API del cliente obtenidas con exito',
            data: await this._listMyNexlifyKeysUseCase.run({ data: null })
        })
    }

    @Put(':id/revoke')
    @HttpCode(200)
    async revoke(@Param('id') id: string): Promise<ClientResponse<boolean>> {
        return new ClientResponse({
            ok: true,
            message: 'Clave API revocada con exito',
            data: await this._revokeNexlifyKeyUseCase.run({ data: BigInt(id) })
        })
    }
}
