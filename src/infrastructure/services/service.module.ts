import { Module } from "@nestjs/common";
import { MAILER_SERVICE } from "src/core/application/contracts/services";
import { MailerService } from "./mailer.service";
import { TEMPLATE_SERVICE } from "src/core/application/contracts/services/template.service";
import { TemplateService } from "./template.service";

@Module({
    providers: [
        {
            provide: MAILER_SERVICE,
            useClass: MailerService
        },
        {
            provide: TEMPLATE_SERVICE,
            useClass: TemplateService
        }
    ],
    exports: [MAILER_SERVICE, TEMPLATE_SERVICE]
})

export class ServicesModule { }