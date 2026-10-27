import { Controller, Get, HttpCode, UseGuards } from '@nestjs/common';
import { MasterDataDTO } from 'src/core/application/dtos';
import { IdTypesUseCase } from 'src/core/application/use-cases/master';
import { ClientResponse } from 'src/core/domain/models';
import { AuthGuard } from 'src/infrastructure/guards';

@UseGuards(AuthGuard)
@Controller('api/master')
export class MasterController {
    constructor(private readonly _idTypeUseCase: IdTypesUseCase) {}

    @Get('id-types')
    @HttpCode(200)
    async idTypes(): Promise<ClientResponse<MasterDataDTO[]>> {
        return new ClientResponse({
            ok: true,
            message: 'Tipos de indentificacion obtenidos exitosamente',
            data: await this._idTypeUseCase.run({ data: null }),
        });
    }
}
