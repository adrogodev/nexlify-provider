import {
    Body,
    Controller,
    Get,
    HttpCode,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { PaginateBaseDTO, TemplateInfoDTO } from 'src/core/application/dtos';
import {
    CreateTemplateRequestData,
    CreateTemplateUseCase,
    GetTemplatesRequestData,
    GetTemplatesUseCase,
    TemplateIdParam,
    UpdateTemplateRequestData,
    UpdateTemplateUseCase,
} from 'src/core/application/use-cases/templates';
import { ClientResponse } from 'src/core/domain/models';
import { AuthGuard } from 'src/infrastructure/guards';
import { ContextInterceptor } from 'src/infrastructure/interceptors/context.interceptor';

@UseGuards(AuthGuard)
@UseInterceptors(ContextInterceptor)
@Controller('api/templates')
export class TemplatesController {
    constructor(
        private readonly _createTemplateUseCase: CreateTemplateUseCase,
        private readonly _getTemplatesUseCase: GetTemplatesUseCase,
        private readonly _updateTemplateUseCase: UpdateTemplateUseCase,
    ) {}

    @Post()
    @HttpCode(200)
    async create(
        @Body() body: CreateTemplateRequestData,
    ): Promise<ClientResponse<TemplateInfoDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Plantilla creada exitosamente',
            data: await this._createTemplateUseCase.run({ data: { ...body } }),
        });
    }

    @Get()
    @HttpCode(200)
    async list(
        @Query() query: GetTemplatesRequestData,
    ): Promise<ClientResponse<PaginateBaseDTO<TemplateInfoDTO[]>>> {
        return new ClientResponse({
            ok: true,
            message: 'Plantillas obtenidas con exito',
            data: await this._getTemplatesUseCase.run({ data: { ...query } }),
        });
    }

    @Put(':id')
    @HttpCode(200)
    async update(
        @Param() param: TemplateIdParam,
        @Body() body: UpdateTemplateRequestData,
    ): Promise<ClientResponse<TemplateInfoDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Plantilla actualizada exitosamente',
            data: await this._updateTemplateUseCase.run({
                data: { id_template: param.id, ...body },
            }),
        });
    }
}
