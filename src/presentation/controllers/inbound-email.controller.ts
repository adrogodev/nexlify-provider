import {
    Body,
    Controller,
    HttpCode,
    Post,
    RawBodyRequest,
    Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { InboundEmailRequestData } from 'src/core/application/use-cases/email/inbound-email/inbound-email.request-data';
import { InboundEmailUseCase } from 'src/core/application/use-cases/email/inbound-email/inbound-email.usecase';
import { UnauthenticatedException } from 'src/core/domain/exceptions';
import { ClientResponse } from 'src/core/domain/models';
import { InboundWebhookSecurityService } from 'src/infrastructure/services/inbound-webhook.security';

/**
 * Provider-agnostic ingestion of replies over the mapped sent emails.
 * PUBLIC route: access control is the HMAC signature of the raw body
 * against INBOUND_WEBHOOK_SECRET (S3).
 */
@Controller('api/email')
export class InboundEmailController {
    constructor(
        private readonly _inboundEmailUseCase: InboundEmailUseCase,
        private readonly _inboundWebhookSecurity: InboundWebhookSecurityService,
    ) {}

    @HttpCode(200)
    @Post('inbound')
    async inbound(
        @Req() request: RawBodyRequest<Request>,
        @Body() body: InboundEmailRequestData,
    ): Promise<ClientResponse<Record<string, unknown>>> {
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

        const result = await this._inboundEmailUseCase.run({
            data: { ...body },
        });

        return new ClientResponse({
            ok: true,
            message: 'Correo entrante procesado',
            data: {
                received: result.received,
                email_uuid: result.email_uuid,
                parent_email_uuid: result.parent_email_uuid,
                threaded: result.threaded,
                attachments_ingested: result.attachments_ingested,
                attachments_rejected: result.attachments_rejected,
            },
        });
    }
}
