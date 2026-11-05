import { Module } from "@nestjs/common";
import { REQUEST_CONTEXT } from "src/core/application/contracts/infrastructure";
import { CERTIFICATE_PDF_RENDERER, HTTP_DELIVERY_SERVICE, MAILER_SERVICE, REPLY_ANALYZER } from "src/core/application/contracts/services";
import { ClaudeReplyAnalyzerService } from "./claude-reply-analyzer.service";
import { AppEnvs } from "../environments/app-env.config";
import { PdfkitCertificateRendererService } from "./pdfkit-certificate-renderer.service";
import { MailerService } from "./mailer.service";
import { TEMPLATE_SERVICE } from "src/core/application/contracts/services/template.service";
import { TemplateService } from "./template.service";
import { WebhookHttpDeliveryService } from "./webhook-http-delivery.service";
import { ContextInterceptor } from "../interceptors/context.interceptor";
import { ContextService } from "./context.service";

@Module({
    providers: [
        ContextService,
        ContextInterceptor,
        {
            provide: REQUEST_CONTEXT,
            useExisting: ContextService
        },
        {
            provide: MAILER_SERVICE,
            useClass: MailerService
        },
        {
            provide: TEMPLATE_SERVICE,
            useClass: TemplateService
        },
        {
            provide: HTTP_DELIVERY_SERVICE,
            useClass: WebhookHttpDeliveryService
        },
        {
            provide: REPLY_ANALYZER,
            useFactory: () => new ClaudeReplyAnalyzerService(AppEnvs.ANTHROPIC_API_KEY, AppEnvs.ANTHROPIC_MODEL)
        },
        {
            provide: CERTIFICATE_PDF_RENDERER,
            useClass: PdfkitCertificateRendererService
        }
    ],
    exports: [ContextService, ContextInterceptor, REQUEST_CONTEXT, MAILER_SERVICE, TEMPLATE_SERVICE, HTTP_DELIVERY_SERVICE, REPLY_ANALYZER, CERTIFICATE_PDF_RENDERER]
})

export class ServicesModule { }