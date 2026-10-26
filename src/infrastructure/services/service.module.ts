import { Module } from "@nestjs/common";
import { REQUEST_CONTEXT } from "src/core/application/contracts/infrastructure";
import { HTTP_DELIVERY_SERVICE, MAILER_SERVICE } from "src/core/application/contracts/services";
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
        }
    ],
    exports: [ContextService, ContextInterceptor, REQUEST_CONTEXT, MAILER_SERVICE, TEMPLATE_SERVICE, HTTP_DELIVERY_SERVICE]
})

export class ServicesModule { }