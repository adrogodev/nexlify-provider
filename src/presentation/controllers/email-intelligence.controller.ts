import {
    Controller,
    Get,
    HttpCode,
    Param,
    Post,
    Res,
    StreamableFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import {
    type CertificateDTO,
    GetCertificatePdfUseCase,
    GetCertificateUseCase,
    IssueCertificateUseCase,
} from 'src/core/application/use-cases/certificates';
import {
    type AiAnalysisDTO,
    AnalyzeEmailUseCase,
} from 'src/core/application/use-cases/email/analyze-reply';
import { EmailIdParam } from 'src/core/application/use-cases/email/email.request-data';
import { ClientResponse } from 'src/core/domain/models';
import { EmailAuthGuard } from 'src/infrastructure/guards';
import { ContextInterceptor } from 'src/infrastructure/interceptors/context.interceptor';

/**
 * Evidence + intelligence over a single email (S7 certified email, S8 AI
 * re-analysis). Dual auth; clients only reach their own emails.
 */
@UseGuards(EmailAuthGuard)
@UseInterceptors(ContextInterceptor)
@Controller('api/email')
export class EmailIntelligenceController {
    constructor(
        private readonly _issueCertificateUseCase: IssueCertificateUseCase,
        private readonly _getCertificateUseCase: GetCertificateUseCase,
        private readonly _getCertificatePdfUseCase: GetCertificatePdfUseCase,
        private readonly _analyzeEmailUseCase: AnalyzeEmailUseCase,
    ) {}

    @Post(':emailId/certificate')
    @HttpCode(200)
    async issueCertificate(
        @Param() { emailId }: EmailIdParam,
    ): Promise<ClientResponse<CertificateDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Certificado emitido exitosamente',
            data: await this._issueCertificateUseCase.run({ data: emailId }),
        });
    }

    @Get(':emailId/certificate')
    @HttpCode(200)
    async getCertificate(
        @Param() { emailId }: EmailIdParam,
    ): Promise<ClientResponse<CertificateDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Certificado obtenido con exito',
            data: await this._getCertificateUseCase.run({ data: emailId }),
        });
    }

    @Get(':emailId/certificate/pdf')
    @HttpCode(200)
    async getCertificatePdf(
        @Param() { emailId }: EmailIdParam,
        @Res({ passthrough: true }) response: Response,
    ): Promise<StreamableFile> {
        const pdf = await this._getCertificatePdfUseCase.run({ data: emailId });
        response.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${pdf.filename}"`,
        });
        return new StreamableFile(pdf.content);
    }

    @Post(':emailId/analyze')
    @HttpCode(200)
    async analyze(
        @Param() { emailId }: EmailIdParam,
    ): Promise<ClientResponse<AiAnalysisDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Analisis IA completado',
            data: await this._analyzeEmailUseCase.run({ data: emailId }),
        });
    }
}
