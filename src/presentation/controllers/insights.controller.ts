import {
    Controller,
    Get,
    HttpCode,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {
    CertificateCodeParam,
    type CertificateVerificationDTO,
    VerifyCertificateUseCase,
} from 'src/core/application/use-cases/certificates';
import {
    type AiStatusDTO,
    GetAiStatusUseCase,
} from 'src/core/application/use-cases/email/analyze-reply';
import {
    GetStatsOverviewRequestData,
    GetStatsOverviewUseCase,
    type StatsOverviewDTO,
} from 'src/core/application/use-cases/stats';
import { ClientResponse } from 'src/core/domain/models';
import { EmailAuthGuard } from 'src/infrastructure/guards';
import { ContextInterceptor } from 'src/infrastructure/interceptors/context.interceptor';

/** Dashboard aggregates (S6). Dual auth; clients are scoped to their own emails. */
@UseGuards(EmailAuthGuard)
@UseInterceptors(ContextInterceptor)
@Controller('api/stats')
export class StatsController {
    constructor(
        private readonly _getStatsOverviewUseCase: GetStatsOverviewUseCase,
    ) {}

    @Get('overview')
    @HttpCode(200)
    async overview(
        @Query() query: GetStatsOverviewRequestData,
    ): Promise<ClientResponse<StatsOverviewDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Estadisticas obtenidas con exito',
            data: await this._getStatsOverviewUseCase.run({
                data: { ...query },
            }),
        });
    }
}

/** AI reply intelligence status (S8). Dual auth. */
@UseGuards(EmailAuthGuard)
@Controller('api/ai')
export class AiController {
    constructor(private readonly _getAiStatusUseCase: GetAiStatusUseCase) {}

    @Get('status')
    @HttpCode(200)
    async status(): Promise<ClientResponse<AiStatusDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Estado del analisis IA',
            data: await this._getAiStatusUseCase.run({ data: null }),
        });
    }
}

/**
 * PUBLIC certified-email verification (S7): anyone holding the code can
 * check validity and hashes; no body content is exposed.
 */
@Controller('api/certificates')
export class CertificatesController {
    constructor(
        private readonly _verifyCertificateUseCase: VerifyCertificateUseCase,
    ) {}

    @Get(':code/verify')
    @HttpCode(200)
    async verify(
        @Param() { code }: CertificateCodeParam,
    ): Promise<ClientResponse<CertificateVerificationDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Verificacion del certificado',
            data: await this._verifyCertificateUseCase.run({ data: code }),
        });
    }
}
