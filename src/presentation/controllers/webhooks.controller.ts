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
import type { PaginateBaseDTO } from 'src/core/application/dtos';
import {
    ListMyWebhookEndpointsUseCase,
    ListWebhookDeliveriesRequestData,
    ListWebhookDeliveriesUseCase,
    type RedeliverResultDTO,
    RedeliverWebhookDeliveryUseCase,
    TestWebhookEndpointUseCase,
    type WebhookDeliveryItemDTO,
    WebhookDeliveryIdParam,
    type WebhookTestResultDTO,
    OwnedWebhookEndpointDTO,
    RegisterWebhookEndpointRequestData,
    RegisterWebhookEndpointUseCase,
    UpdateWebhookEndpointRequestData,
    UpdateWebhookEndpointUseCase,
    WebhookEndpointSecretDTO,
    WebhookEndpointUuidParam,
} from 'src/core/application/use-cases/webhooks';
import { ClientResponse } from 'src/core/domain/models';
import { EmailAuthGuard } from 'src/infrastructure/guards';
import { ContextInterceptor } from 'src/infrastructure/interceptors/context.interceptor';

/**
 * Webhook management (JWT or X-API-Key). Registering is the only flow that
 * returns the secret exactly once; listings and updates never expose it.
 */
@UseGuards(EmailAuthGuard)
@UseInterceptors(ContextInterceptor)
@Controller('api/webhooks')
export class WebhooksController {
    constructor(
        private readonly _registerWebhookEndpointUseCase: RegisterWebhookEndpointUseCase,
        private readonly _listMyWebhookEndpointsUseCase: ListMyWebhookEndpointsUseCase,
        private readonly _updateWebhookEndpointUseCase: UpdateWebhookEndpointUseCase,
        private readonly _listWebhookDeliveriesUseCase: ListWebhookDeliveriesUseCase,
        private readonly _redeliverWebhookDeliveryUseCase: RedeliverWebhookDeliveryUseCase,
        private readonly _testWebhookEndpointUseCase: TestWebhookEndpointUseCase,
    ) {}

    @Post()
    @HttpCode(200)
    async register(
        @Body() body: RegisterWebhookEndpointRequestData,
    ): Promise<ClientResponse<WebhookEndpointSecretDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Webhook registrado exitosamente',
            data: await this._registerWebhookEndpointUseCase.run({
                data: { ...body },
            }),
        });
    }

    @Get('my')
    @HttpCode(200)
    async listMy(): Promise<ClientResponse<OwnedWebhookEndpointDTO[]>> {
        return new ClientResponse({
            ok: true,
            message: 'Webhooks obtenidos con exito',
            data: await this._listMyWebhookEndpointsUseCase.run({ data: null }),
        });
    }

    @Get(':endpointUuid/deliveries')
    @HttpCode(200)
    async deliveries(
        @Param() param: WebhookEndpointUuidParam,
        @Query() query: ListWebhookDeliveriesRequestData,
    ): Promise<ClientResponse<PaginateBaseDTO<WebhookDeliveryItemDTO[]>>> {
        return new ClientResponse({
            ok: true,
            message: 'Historial de entregas obtenido con exito',
            data: await this._listWebhookDeliveriesUseCase.run({
                data: { endpoint_uuid: param.endpointUuid, ...query },
            }),
        });
    }

    @Post('deliveries/:deliveryId/redeliver')
    @HttpCode(200)
    async redeliver(
        @Param() param: WebhookDeliveryIdParam,
    ): Promise<ClientResponse<RedeliverResultDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Entrega reencolada exitosamente',
            data: await this._redeliverWebhookDeliveryUseCase.run({
                data: param.deliveryId,
            }),
        });
    }

    @Post(':endpointUuid/test')
    @HttpCode(200)
    async test(
        @Param() param: WebhookEndpointUuidParam,
    ): Promise<ClientResponse<WebhookTestResultDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Evento de prueba enviado',
            data: await this._testWebhookEndpointUseCase.run({
                data: param.endpointUuid,
            }),
        });
    }

    @Put(':endpointUuid')
    @HttpCode(200)
    async update(
        @Param() param: WebhookEndpointUuidParam,
        @Body() body: UpdateWebhookEndpointRequestData,
    ): Promise<ClientResponse<OwnedWebhookEndpointDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Webhook actualizado exitosamente',
            data: await this._updateWebhookEndpointUseCase.run({
                data: { endpoint_uuid: param.endpointUuid, ...body },
            }),
        });
    }
}
