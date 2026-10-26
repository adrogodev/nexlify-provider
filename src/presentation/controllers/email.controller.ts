import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { EmailAttachmentContentDTO, EmailDetailDTO, EmailListItemDTO, PaginateBaseDTO, SendEmailResultDTO } from "src/core/application/dtos";
import { DownloadEmailAttachmentUseCase } from "src/core/application/use-cases/email/get-email-detail/download-email-attachment.usecase";
import { GetEmailDetailUseCase } from "src/core/application/use-cases/email/get-email-detail/get-email-detail.usecase";
import { GetEmailsUseCase } from "src/core/application/use-cases/email/get-emails/get-emails.usecase";
import { DiffuseEmailRequestData, EmailAttachmentIndexParam, EmailIdParam, GetEmailsRequestData } from "src/core/application/use-cases/email/email.request-data";
import { RetryEmailUseCase } from "src/core/application/use-cases/email/retry-email/retry-email.usecase";
import { SendEmailRequestData } from "src/core/application/use-cases/email/send-email/send-email.request-data";
import { SendEmailUseCase } from "src/core/application/use-cases/email/send-email/send-email.usecase";
import { DiffuseEmailResultDTO, DiffuseEmailUseCase } from "src/core/application/use-cases/email/diffuse-email/diffuse-email.usecase";
import { ClientResponse } from "src/core/domain/models";
import { AuthGuard, ConfigurationExistsGuard, EmailAuthGuard } from "src/infrastructure/guards";

@UseGuards(EmailAuthGuard)
@Controller('api/email')
export class EmailController {
    constructor(
        private readonly _sendEmailUseCase: SendEmailUseCase,
        private readonly _getEmailDetailUseCase: GetEmailDetailUseCase,
        private readonly _getEmailsUseCase: GetEmailsUseCase,
        private readonly _retryEmailUseCase: RetryEmailUseCase,
        private readonly _diffuseEmailUseCase: DiffuseEmailUseCase,
        private readonly _downloadEmailAttachmentUseCase: DownloadEmailAttachmentUseCase,
    ) { }

    @Post('send')
    @HttpCode(200)
    @UseGuards(ConfigurationExistsGuard)
    async send(@Body() body: SendEmailRequestData): Promise<ClientResponse<SendEmailResultDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Correo en proceso de envio',
            data: await this._sendEmailUseCase.run({ data: { ...body } })
        })
    }

    @Post('diffuse')
    @HttpCode(200)
    @UseGuards(ConfigurationExistsGuard)
    async diffuse(@Body() body: DiffuseEmailRequestData): Promise<ClientResponse<DiffuseEmailResultDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Correos encolados para difusion',
            data: await this._diffuseEmailUseCase.run({ data: { ...body } })
        })
    }

    @Get()
    @HttpCode(200)
    async list(@Query() query: GetEmailsRequestData): Promise<ClientResponse<PaginateBaseDTO<EmailListItemDTO[]>>> {
        const filters = {
            ...query,
            id_client: query.id_client === undefined ? undefined : BigInt(query.id_client),
        };
        return new ClientResponse({
            ok: true,
            message: 'Correos obtenidos con exito',
            data: await this._getEmailsUseCase.run({ data: filters })
        })
    }

    @Get(':emailId')
    @HttpCode(200)
    async detail(@Param() { emailId }: EmailIdParam): Promise<ClientResponse<EmailDetailDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Detalle del correo obtenido con exito',
            data: await this._getEmailDetailUseCase.run({ data: emailId })
        })
    }

    @Post(':emailId/retry')
    @HttpCode(200)
    @UseGuards(ConfigurationExistsGuard)
    async retry(@Param() { emailId }: EmailIdParam): Promise<ClientResponse<SendEmailResultDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Reintento de envio ejecutado',
            data: await this._retryEmailUseCase.run({ data: emailId })
        })
    }

    @Get(':emailId/attachments/:attachmentIndex')
    @HttpCode(200)
    async downloadAttachment(@Param() params: EmailAttachmentIndexParam): Promise<ClientResponse<EmailAttachmentContentDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Adjunto obtenido con exito',
            data: await this._downloadEmailAttachmentUseCase.run({ data: { emailId: params.emailId, index: params.attachmentIndex } })
        })
    }
}
