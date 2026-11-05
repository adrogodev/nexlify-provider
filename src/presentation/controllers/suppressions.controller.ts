import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    Post,
    Query,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {
    DeletedDTO,
    PaginateBaseDTO,
    SuppressionDTO,
} from 'src/core/application/dtos';
import {
    AddSuppressionRequestData,
    AddSuppressionUseCase,
    ListSuppressionsRequestData,
    ListSuppressionsUseCase,
    RemoveSuppressionUseCase,
    SuppressionUuidParam,
} from 'src/core/application/use-cases/suppressions';
import { ClientResponse } from 'src/core/domain/models';
import { AuthGuard } from 'src/infrastructure/guards';
import { ContextInterceptor } from 'src/infrastructure/interceptors/context.interceptor';

/** Suppression list management (S5, JWT): clients manage their own rows, admins all. */
@UseGuards(AuthGuard)
@UseInterceptors(ContextInterceptor)
@Controller('api/suppressions')
export class SuppressionsController {
    constructor(
        private readonly _listSuppressionsUseCase: ListSuppressionsUseCase,
        private readonly _addSuppressionUseCase: AddSuppressionUseCase,
        private readonly _removeSuppressionUseCase: RemoveSuppressionUseCase,
    ) {}

    @Get()
    @HttpCode(200)
    async list(
        @Query() query: ListSuppressionsRequestData,
    ): Promise<ClientResponse<PaginateBaseDTO<SuppressionDTO[]>>> {
        return new ClientResponse({
            ok: true,
            message: 'Supresiones obtenidas con exito',
            data: await this._listSuppressionsUseCase.run({
                data: { ...query },
            }),
        });
    }

    @Post()
    @HttpCode(200)
    async add(
        @Body() body: AddSuppressionRequestData,
    ): Promise<ClientResponse<SuppressionDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Supresion registrada exitosamente',
            data: await this._addSuppressionUseCase.run({ data: { ...body } }),
        });
    }

    @Delete(':suppressionUuid')
    @HttpCode(200)
    async remove(
        @Param() { suppressionUuid }: SuppressionUuidParam,
    ): Promise<ClientResponse<DeletedDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Supresion eliminada exitosamente',
            data: await this._removeSuppressionUseCase.run({
                data: suppressionUuid,
            }),
        });
    }
}
