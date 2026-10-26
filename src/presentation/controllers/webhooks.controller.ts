import { Body, Controller, Get, HttpCode, Param, Post, Put, UseGuards, UseInterceptors } from "@nestjs/common";
import { ListMyWebhookEndpointsUseCase, OwnedWebhookEndpointDTO, RegisterWebhookEndpointRequestData, RegisterWebhookEndpointUseCase, UpdateWebhookEndpointRequestData, UpdateWebhookEndpointUseCase, WebhookEndpointSecretDTO, WebhookEndpointUuidParam } from "src/core/application/use-cases/webhooks";
import { ClientResponse } from "src/core/domain/models";
import { EmailAuthGuard } from "src/infrastructure/guards";
import { ContextInterceptor } from "src/infrastructure/interceptors/context.interceptor";

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
    ) { }

    @Post()
    @HttpCode(200)
    async register(@Body() body: RegisterWebhookEndpointRequestData): Promise<ClientResponse<WebhookEndpointSecretDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Webhook registrado exitosamente',
            data: await this._registerWebhookEndpointUseCase.run({ data: { ...body } })
        });
    }

    @Get('my')
    @HttpCode(200)
    async listMy(): Promise<ClientResponse<OwnedWebhookEndpointDTO[]>> {
        return new ClientResponse({
            ok: true,
            message: 'Webhooks obtenidos con exito',
            data: await this._listMyWebhookEndpointsUseCase.run({ data: null })
        });
    }

    @Put(':endpointUuid')
    @HttpCode(200)
    async update(@Param() param: WebhookEndpointUuidParam, @Body() body: UpdateWebhookEndpointRequestData): Promise<ClientResponse<OwnedWebhookEndpointDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Webhook actualizado exitosamente',
            data: await this._updateWebhookEndpointUseCase.run({ data: { endpoint_uuid: param.endpointUuid, ...body } })
        });
    }
}
