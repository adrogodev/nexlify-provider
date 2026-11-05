import {
    Body,
    Controller,
    HttpCode,
    Post,
    RawBodyRequest,
    Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
    ProcessBounceRequestData,
    ProcessBounceResultDTO,
    ProcessBounceUseCase,
} from 'src/core/application/use-cases/suppressions';
import { UnauthenticatedException } from 'src/core/domain/exceptions';
import { ClientResponse } from 'src/core/domain/models';
import { InboundWebhookSecurityService } from 'src/infrastructure/services/inbound-webhook.security';

/**
 * Bounce / complaint ingestion (S5). PUBLIC route: access control is the same
 * HMAC scheme as `api/email/inbound` (X-Nexlify-Inbound-Signature over the raw
 * body with INBOUND_WEBHOOK_SECRET).
 */
@Controller('api/email/events')
export class EmailBounceController {
    constructor(
        private readonly _processBounceUseCase: ProcessBounceUseCase,
        private readonly _inboundWebhookSecurity: InboundWebhookSecurityService,
    ) {}

    @HttpCode(200)
    @Post('bounce')
    async bounce(
        @Req() request: RawBodyRequest<Request>,
        @Body() body: ProcessBounceRequestData,
    ): Promise<ClientResponse<ProcessBounceResultDTO>> {
        const rawBody =
            typeof request.rawBody === 'string'
                ? request.rawBody
                : request.rawBody?.toString('utf8');
        const signature = (
            request.headers['x-nexlify-inbound-signature'] as string | undefined
        )?.trim();

        if (
            !this._inboundWebhookSecurity.verify(
                rawBody ?? JSON.stringify(body ?? {}),
                signature,
            )
        ) {
            throw new UnauthenticatedException('Firma de entrada invalida');
        }

        return new ClientResponse({
            ok: true,
            message: 'Evento de rebote procesado',
            data: await this._processBounceUseCase.run({ data: { ...body } }),
        });
    }
}
