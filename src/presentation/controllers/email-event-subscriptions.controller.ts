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
import {
    CreateSubscriptionRequestData,
    CreateSubscriptionUseCase,
} from 'src/core/application/use-cases/email-event-subscriptions/create-subscription';
import {
    GetMySubscriptionsRequestData,
    GetMySubscriptionsUseCase,
} from 'src/core/application/use-cases/email-event-subscriptions/get-my-subscriptions';
import { SubscriptionDTO } from 'src/core/application/use-cases/email-event-subscriptions/to-subscription.dto';
import {
    SubscriptionUuidParam,
    UpdateSubscriptionRequestData,
    UpdateSubscriptionUseCase,
} from 'src/core/application/use-cases/email-event-subscriptions/update-subscription';
import { ClientResponse } from 'src/core/domain/models';
import { EmailAuthGuard } from 'src/infrastructure/guards';
import { ContextInterceptor } from 'src/infrastructure/interceptors/context.interceptor';

/**
 * Management of the per-client event subscriptions deciding WHICH events and
 * WHICH fields fan out through the existing webhook pipeline (S4).
 * Auth dual (JWT or X-API-Key) and the subscription identity is db-side uuid.
 */
@UseGuards(EmailAuthGuard)
@UseInterceptors(ContextInterceptor)
@Controller('api/email-events/subscriptions')
export class EmailEventSubscriptionsController {
    constructor(
        private readonly _createSubscriptionUseCase: CreateSubscriptionUseCase,
        private readonly _getMySubscriptionsUseCase: GetMySubscriptionsUseCase,
        private readonly _updateSubscriptionUseCase: UpdateSubscriptionUseCase,
    ) {}

    @Post()
    @HttpCode(200)
    async create(
        @Body() body: CreateSubscriptionRequestData,
    ): Promise<ClientResponse<SubscriptionDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Suscripcion de eventos registrada exitosamente',
            data: await this._createSubscriptionUseCase.run({
                data: { ...body },
            }),
        });
    }

    @Get('my')
    @HttpCode(200)
    async my(
        @Query() query: GetMySubscriptionsRequestData,
    ): Promise<ClientResponse<SubscriptionDTO[]>> {
        const filters = {
            ...query,
            id_client:
                query.id_client === undefined
                    ? undefined
                    : Number(query.id_client),
        };
        return new ClientResponse({
            ok: true,
            message: 'Suscripciones obtenidas con exito',
            data: await this._getMySubscriptionsUseCase.run({ data: filters }),
        });
    }

    @Put(':subscriptionUuid')
    @HttpCode(200)
    async update(
        @Param() param: SubscriptionUuidParam,
        @Body() body: UpdateSubscriptionRequestData,
    ): Promise<ClientResponse<SubscriptionDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Suscripcion actualizada exitosamente',
            data: await this._updateSubscriptionUseCase.run({
                data: { subscription_uuid: param.subscriptionUuid, ...body },
            }),
        });
    }
}
