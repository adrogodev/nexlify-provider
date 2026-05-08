import { Module } from "@nestjs/common";
import { ENCRYPTER, HASH_GENERATOR, JWT_GENERATOR } from "src/core/application/contracts/infrastructure";
import { ADMIN_USER_REPOSITORY, CLIENT_REPOSITORY, NEXLIFY_CONFIGURATION_REPOSITORY, SMTP_SERVER_REPOSITORY } from "src/core/application/contracts/persistence";
import { AuthAdminUserUseCase } from "src/core/application/use-cases/admin-user";
import { RegisterClientUseCase } from "src/core/application/use-cases/clients";
import { AddSmtpServerUseCase } from "src/core/application/use-cases/smtp-server";
import { HelpersModule } from "src/infrastructure/helpers/helpers.module";
import { RepositoriesModule } from "src/infrastructure/repositories/repositories.module";
import { SecurityModule } from "src/infrastructure/security";
import { AdminUserController } from "./admin-user.controller";
import { ClientContoller } from "./client.controller";
import { SmtpServerController } from "./smtp-server.controller";
import { EmailController } from "./email.controller";
import { SendEmailUseCase } from "src/core/application/use-cases/email/send-email/send-email.usecase";
import { MAILER_SERVICE } from "src/core/application/contracts/services";
import { ServicesModule } from "src/infrastructure/services/service.module";
import { NexlifyConfigurationController } from "./nexlify-configuration.controller";
import { AddNexlifyConfigurationUseCase } from "src/core/application/use-cases/nexlify-configuration";
;

@Module({
    imports: [RepositoriesModule, HelpersModule, SecurityModule, ServicesModule],
    controllers: [
        AdminUserController,
        ClientContoller,
        SmtpServerController,
        EmailController,
        NexlifyConfigurationController
    ],
    providers: [
        {
            provide: RegisterClientUseCase,
            useFactory: (repo) => new RegisterClientUseCase(repo),
            inject: [CLIENT_REPOSITORY]
        },
        {
            provide: AuthAdminUserUseCase,
            useFactory: (repo, hashGen, jwtGen, encrypterGen) => new AuthAdminUserUseCase(repo, hashGen, jwtGen, encrypterGen),
            inject: [ADMIN_USER_REPOSITORY, HASH_GENERATOR, JWT_GENERATOR, ENCRYPTER],
        },
        {
            provide: AddSmtpServerUseCase,
            useFactory: (repo) => new AddSmtpServerUseCase(repo),
            inject: [SMTP_SERVER_REPOSITORY]

        },
        {
            provide: SendEmailUseCase,
            useFactory: (service) => new SendEmailUseCase(service),
            inject: [MAILER_SERVICE]
        },
        {
            provide: AddNexlifyConfigurationUseCase,
            useFactory: (repo) => new AddNexlifyConfigurationUseCase(repo),
            inject: [NEXLIFY_CONFIGURATION_REPOSITORY]
        },

    ]
})

export class ControllerModule { }