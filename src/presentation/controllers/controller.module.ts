import { Module } from "@nestjs/common";
import { APP_CONFIG, ENCRYPTER, HASH_GENERATOR, JWT_GENERATOR, REQUEST_CONTEXT } from "src/core/application/contracts/infrastructure";
import { ADMIN_USER_REPOSITORY, CLIENT_CREDENTIALS_REPOSITORY, CLIENT_REPOSITORY, ID_TYPE_REPOSITORY, NEXLIFY_CONFIGURATION_REPOSITORY, NEXLIFY_KEYS_LOGS_REPOSITORY, NEXLIFY_KEYS_REPOSITORY, SMTP_SERVER_REPOSITORY } from "src/core/application/contracts/persistence";
import { MAILER_SERVICE } from "src/core/application/contracts/services";
import { AuthAdminUserUseCase, UserDataUseCase } from "src/core/application/use-cases/admin-user";
import { AssignCredentialsUseCase, ClientDataUseCase, GetAllClientsUseCase, RegisterClientUseCase, SignInUseCase } from "src/core/application/use-cases/clients";
import { SendEmailUseCase } from "src/core/application/use-cases/email/send-email/send-email.usecase";
import { AddNexlifyConfigurationUseCase, GetNexlifyConfigurationUseCase, UpdateNexlifyConfigurationUseCase } from "src/core/application/use-cases/nexlify-configuration";
import { AddSmtpServerUseCase } from "src/core/application/use-cases/smtp-server";
import { HelpersModule } from "src/infrastructure/helpers/helpers.module";
import { RepositoriesModule } from "src/infrastructure/repositories/repositories.module";
import { SecurityModule } from "src/infrastructure/security";
import { ServicesModule } from "src/infrastructure/services/service.module";
import { AdminUserController } from "./admin-user.controller";
import { ClientContoller } from "./client.controller";
import { EmailController } from "./email.controller";
import { NexlifyConfigurationController } from "./nexlify-configuration.controller";
import { SmtpServerController } from "./smtp-server.controller";
import { AuthGuard, ConfigurationExistsGuard, SmtpServerExistsGuard } from "src/infrastructure/guards";
import { TEMPLATE_SERVICE } from "src/core/application/contracts/services/template.service";
import { VerifyCredentialAssignmentTokenUseCase } from "src/core/application/use-cases/verify";
import { VerifyController } from "./verify.controller";
import { IdTypesUseCase } from "src/core/application/use-cases/master";
import { MasterController } from "./master.controller";

@Module({
    imports: [RepositoriesModule, HelpersModule, SecurityModule, ServicesModule],
    controllers: [
        AdminUserController,
        ClientContoller,
        SmtpServerController,
        EmailController,
        NexlifyConfigurationController,
        VerifyController,
        MasterController
    ],
    providers: [
        AuthGuard,
        ConfigurationExistsGuard,
        SmtpServerExistsGuard,
        {
            provide: RegisterClientUseCase,
            useFactory: (repo, credsRepo, jwtGen, encryptor, configRepo, smtpRepo, tmpService, mailerService, appConfig) => new RegisterClientUseCase(repo, credsRepo, jwtGen, encryptor, configRepo, smtpRepo, tmpService, mailerService, appConfig),
            inject: [CLIENT_REPOSITORY, CLIENT_CREDENTIALS_REPOSITORY, JWT_GENERATOR, ENCRYPTER, NEXLIFY_CONFIGURATION_REPOSITORY, SMTP_SERVER_REPOSITORY, TEMPLATE_SERVICE, MAILER_SERVICE, APP_CONFIG]
        },
        {
            provide: AuthAdminUserUseCase,
            useFactory: (repo, hashGen, jwtGen, encrypterGen, appConfig) => new AuthAdminUserUseCase(repo, hashGen, jwtGen, encrypterGen, appConfig),
            inject: [ADMIN_USER_REPOSITORY, HASH_GENERATOR, JWT_GENERATOR, ENCRYPTER, APP_CONFIG],
        },
        {
            provide: UserDataUseCase,
            useFactory: (context, repo) => new UserDataUseCase(context, repo),
            inject: [REQUEST_CONTEXT, ADMIN_USER_REPOSITORY],
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
            useFactory: (repo, smtpRepo) => new AddNexlifyConfigurationUseCase(repo, smtpRepo),
            inject: [NEXLIFY_CONFIGURATION_REPOSITORY, SMTP_SERVER_REPOSITORY]
        },
        {
            provide: GetNexlifyConfigurationUseCase,
            useFactory: (configurationRepo, SmtpRepo) => new GetNexlifyConfigurationUseCase(configurationRepo, SmtpRepo),
            inject: [NEXLIFY_CONFIGURATION_REPOSITORY, SMTP_SERVER_REPOSITORY]
        },
        {
            provide: UpdateNexlifyConfigurationUseCase,
            useFactory: (repo) => new UpdateNexlifyConfigurationUseCase(repo),
            inject: [NEXLIFY_CONFIGURATION_REPOSITORY]
        },
        {
            provide: VerifyCredentialAssignmentTokenUseCase,
            useFactory: (repo, jwtGen, encryptor, appConfig) => new VerifyCredentialAssignmentTokenUseCase(repo, jwtGen, encryptor, appConfig),
            inject: [CLIENT_CREDENTIALS_REPOSITORY, JWT_GENERATOR, ENCRYPTER, APP_CONFIG]
        },
        {
            provide: AssignCredentialsUseCase,
            useFactory: (cliRepo, credsRepo, keysRepo, keysLogRepo, jwtGen, encrypterGen, hasGen, appConfig) => new AssignCredentialsUseCase(cliRepo, credsRepo, keysRepo, keysLogRepo, jwtGen, encrypterGen, hasGen, appConfig),
            inject: [CLIENT_REPOSITORY, CLIENT_CREDENTIALS_REPOSITORY, NEXLIFY_KEYS_REPOSITORY, NEXLIFY_KEYS_LOGS_REPOSITORY, JWT_GENERATOR, ENCRYPTER, HASH_GENERATOR, APP_CONFIG]
        },
        {
            provide: SignInUseCase,
            useFactory: (credsRepo, cliRepo, hashGen, jwtGen, encrypterGen, appConfig) => new SignInUseCase(credsRepo, cliRepo, hashGen, jwtGen, encrypterGen, appConfig),
            inject: [CLIENT_CREDENTIALS_REPOSITORY, CLIENT_REPOSITORY, HASH_GENERATOR, JWT_GENERATOR, ENCRYPTER, APP_CONFIG]
        },
        {
            provide: ClientDataUseCase,
            useFactory: (context, cliRepo, cliCredsRepo) => new ClientDataUseCase(context, cliRepo, cliCredsRepo),
            inject: [REQUEST_CONTEXT, CLIENT_REPOSITORY, CLIENT_CREDENTIALS_REPOSITORY]
        },
        {
            provide: GetAllClientsUseCase,
            useFactory: (repo, idTypeRepo) => new GetAllClientsUseCase(repo, idTypeRepo),
            inject: [CLIENT_REPOSITORY, ID_TYPE_REPOSITORY]
        },
        {
            provide: IdTypesUseCase,
            useFactory: (repo) => new IdTypesUseCase(repo),
            inject: [ID_TYPE_REPOSITORY]
        }

    ]
})

export class ControllerModule { }
