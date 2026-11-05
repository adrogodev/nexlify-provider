import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    Post,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { DeletedDTO, SendingDomainDTO } from 'src/core/application/dtos';
import {
    DeleteSendingDomainUseCase,
    ListSendingDomainsUseCase,
    RegisterSendingDomainRequestData,
    RegisterSendingDomainUseCase,
    SendingDomainUuidParam,
    VerifySendingDomainUseCase,
} from 'src/core/application/use-cases/sending-domains';
import { ClientResponse } from 'src/core/domain/models';
import { AuthGuard } from 'src/infrastructure/guards';
import { ContextInterceptor } from 'src/infrastructure/interceptors/context.interceptor';

/**
 * Sending domains (S4, JWT): DKIM keypair generation, DNS records to publish
 * and DNS verification. The DKIM private key never leaves the server.
 */
@UseGuards(AuthGuard)
@UseInterceptors(ContextInterceptor)
@Controller('api/domains')
export class SendingDomainsController {
    constructor(
        private readonly _registerSendingDomainUseCase: RegisterSendingDomainUseCase,
        private readonly _listSendingDomainsUseCase: ListSendingDomainsUseCase,
        private readonly _verifySendingDomainUseCase: VerifySendingDomainUseCase,
        private readonly _deleteSendingDomainUseCase: DeleteSendingDomainUseCase,
    ) {}

    @Post()
    @HttpCode(200)
    async register(
        @Body() body: RegisterSendingDomainRequestData,
    ): Promise<ClientResponse<SendingDomainDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Dominio registrado exitosamente',
            data: await this._registerSendingDomainUseCase.run({
                data: { ...body },
            }),
        });
    }

    @Get()
    @HttpCode(200)
    async list(): Promise<ClientResponse<SendingDomainDTO[]>> {
        return new ClientResponse({
            ok: true,
            message: 'Dominios obtenidos con exito',
            data: await this._listSendingDomainsUseCase.run({ data: null }),
        });
    }

    @Post(':domainUuid/verify')
    @HttpCode(200)
    async verify(
        @Param() { domainUuid }: SendingDomainUuidParam,
    ): Promise<ClientResponse<SendingDomainDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Verificacion DNS ejecutada',
            data: await this._verifySendingDomainUseCase.run({
                data: domainUuid,
            }),
        });
    }

    @Delete(':domainUuid')
    @HttpCode(200)
    async remove(
        @Param() { domainUuid }: SendingDomainUuidParam,
    ): Promise<ClientResponse<DeletedDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Dominio eliminado exitosamente',
            data: await this._deleteSendingDomainUseCase.run({
                data: domainUuid,
            }),
        });
    }
}
