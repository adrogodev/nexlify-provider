import { Module } from "@nestjs/common";
import { REQUEST_CONTEXT } from "src/core/application/contracts/infrastructure";
import { HTTP_DELIVERY_SERVICE, MAILER_SERVICE } from "src/core/application/contracts/services";
import { MailerService } from "./mailer.service";
import { TEMPLATE_SERVICE } from "src/core/application/contracts/services/template.service";
import { TemplateService } from "./template.service";
import { WebhookHttpDeliveryService } from "./webhook-http-delivery.service";
import { ContextInterceptor } from "../interceptors/context.interceptor";
import { ContextService } from "./context.service";
import { DKIM_KEY_GENERATOR, DNS_RESOLVER, UNSUBSCRIBE_TOKEN_SERVICE } from "src/core/application/contracts/services";
import { AppEnvs } from "../environments/app-env.config";
import { DkimKeyGeneratorService } from "./dkim-key-generator.service";
import { DnsResolverService } from "./dns-resolver.service";
import { UnsubscribeTokenService } from "./unsubscribe-token.service";

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
        // S4/S5 (send pipeline)
        {
            provide: DNS_RESOLVER,
            useClass: DnsResolverService
        },
        {
            provide: DKIM_KEY_GENERATOR,
            useClass: DkimKeyGeneratorService
        },
        {
            provide: UNSUBSCRIBE_TOKEN_SERVICE,
            useFactory: () => new UnsubscribeTokenService(AppEnvs.ENCRYPT_KEY, AppEnvs.PUBLIC_API_URL)
        }
    ],
    exports: [ContextService, ContextInterceptor, REQUEST_CONTEXT, MAILER_SERVICE, TEMPLATE_SERVICE, HTTP_DELIVERY_SERVICE, DNS_RESOLVER, DKIM_KEY_GENERATOR, UNSUBSCRIBE_TOKEN_SERVICE]
})

export class ServicesModule { }