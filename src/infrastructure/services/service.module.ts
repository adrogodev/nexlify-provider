import { Module } from "@nestjs/common";
import { MAILER_SERVICE } from "src/core/application/contracts/services";
import { MailerService } from "./mailer.service";

@Module({
    providers: [
        {
            provide: MAILER_SERVICE,
            useClass: MailerService
        }
    ],
    exports: [MAILER_SERVICE]
})

export class ServicesModule { }