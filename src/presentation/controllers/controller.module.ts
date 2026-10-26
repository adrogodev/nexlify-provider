import { Module } from "@nestjs/common";
import { APP_CONFIG, ENCRYPTER, HASH_GENERATOR, ID_GENERATOR, JWT_GENERATOR, PASSWORD_HASHER, REQUEST_CONTEXT } from "src/core/application/contracts/infrastructure";
import { ADMIN_USER_REPOSITORY, CLIENT_CREDENTIALS_REPOSITORY, CLIENT_REPOSITORY, EMAIL_SEND_LOGS_REPOSITORY, EMAILS_REPOSITORY, ID_TYPE_REPOSITORY, NEXLIFY_CONFIGURATION_REPOSITORY, NEXLIFY_KEYS_LOGS_REPOSITORY, NEXLIFY_KEYS_REPOSITORY, SMTP_SERVER_REPOSITORY, WEBHOOK_DELIVERIES_REPOSITORY, WEBHOOK_ENDPOINTS_REPOSITORY } from "src/core/application/contracts/persistence";
import { HTTP_DELIVERY_SERVICE, MAILER_SERVICE } from "src/core/application/contracts/services";
import { GenerateNexlifyKeyUseCase, ListMyNexlifyKeysUseCase, RevokeNexlifyKeyUseCase } from "src/core/application/use-cases/nexlify-keys";
import { AuthAdminUserUseCase, UserDataUseCase } from "src/core/application/use-cases/admin-user";
import { AssignCredentialsUseCase, ClientDataUseCase, GetAllClientsUseCase, RegisterClientUseCase, SignInUseCase } from "src/core/application/use-cases/clients";
import { UpdateClientUseCase } from "src/core/application/use-cases/clients/update-client";
import { UpdateClientStateUseCase } from "src/core/application/use-cases/clients/update-client-state";
import { ForgotPasswordUseCase } from "src/core/application/use-cases/clients/forgot-password";
import { ResetPasswordUseCase } from "src/core/application/use-cases/clients/reset-password";
import { SendEmailUseCase } from "src/core/application/use-cases/email/send-email/send-email.usecase";
import { EmailAttemptService } from "src/core/application/use-cases/email/services/email-attempt.service";
import { DiffuseEmailUseCase } from "src/core/application/use-cases/email/diffuse-email/diffuse-email.usecase";
import { GetEmailDetailUseCase } from "src/core/application/use-cases/email/get-email-detail/get-email-detail.usecase";
import { GetEmailsUseCase } from "src/core/application/use-cases/email/get-emails/get-emails.usecase";
import { RetryDueEmailsUseCase } from "src/core/application/use-cases/email/retry-due/retry-due-emails.usecase";
import { RetryEmailUseCase } from "src/core/application/use-cases/email/retry-email/retry-email.usecase";
import { EmailRetryScheduler } from "src/infrastructure/services/email-retry.scheduler.service";
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
import { AuthGuard, ConfigurationExistsGuard, EmailAuthGuard, SmtpServerExistsGuard, ApiKeyGuard } from "src/infrastructure/guards";
import { TEMPLATE_SERVICE } from "src/core/application/contracts/services/template.service";
import { VerifyCredentialAssignmentTokenUseCase } from "src/core/application/use-cases/verify";
import { VerifyController } from "./verify.controller";
import { IdTypesUseCase } from "src/core/application/use-cases/master";
import { MasterController } from "./master.controller";
import { NexlifyKeysController } from "./nexlify-keys.controller";
import { UsersController } from "./users.controller";
import { TemplatesController } from "./templates.controller";
import { CreateUserUseCase, GetUsersUseCase, UpdateUserUseCase } from "src/core/application/use-cases/users";
import { USERS_REPOSITORY, TEMPLATES_REPOSITORY } from "src/core/application/contracts/persistence";
import { CreateTemplateUseCase, GetTemplatesUseCase, UpdateTemplateUseCase } from "src/core/application/use-cases/templates";
import { ListMyWebhookEndpointsUseCase, RegisterWebhookEndpointUseCase, UpdateWebhookEndpointUseCase } from "src/core/application/use-cases/webhooks";
import { WebhookDeliveryScheduler } from "src/infrastructure/services/webhook-delivery.scheduler.service";
import { WebhooksController } from "./webhooks.controller";

@Module({
    imports: [RepositoriesModule, HelpersModule, SecurityModule, ServicesModule],
    controllers: [
        AdminUserController,
        ClientContoller,
        SmtpServerController,
        EmailController,
        NexlifyConfigurationController,
        VerifyController,
        MasterController,
        NexlifyKeysController,
        UsersController,
        TemplatesController,
        WebhooksController
    ],
    providers: [
        AuthGuard,
        {
            provide: ApiKeyGuard,
            useFactory: (keysRepo, hashGen) => new ApiKeyGuard(keysRepo, hashGen),
            inject: [NEXLIFY_KEYS_REPOSITORY, HASH_GENERATOR]
        },
        {
            provide: EmailAuthGuard,
            useFactory: (apiKeyGuard, authGuard) => new EmailAuthGuard(apiKeyGuard, authGuard),
            inject: [ApiKeyGuard, AuthGuard]
        },
        ConfigurationExistsGuard,
        SmtpServerExistsGuard,
        {
            provide: GenerateNexlifyKeyUseCase,
            useFactory: (context, keysRepo, hashGen) => new GenerateNexlifyKeyUseCase(context, keysRepo, hashGen),
            inject: [REQUEST_CONTEXT, NEXLIFY_KEYS_REPOSITORY, HASH_GENERATOR]
        },
        {
            provide: ListMyNexlifyKeysUseCase,
            useFactory: (context, keysRepo) => new ListMyNexlifyKeysUseCase(context, keysRepo),
            inject: [REQUEST_CONTEXT, NEXLIFY_KEYS_REPOSITORY]
        },
        {
            provide: RevokeNexlifyKeyUseCase,
            useFactory: (context, keysRepo) => new RevokeNexlifyKeyUseCase(context, keysRepo),
            inject: [REQUEST_CONTEXT, NEXLIFY_KEYS_REPOSITORY]
        },
        {
            provide: RegisterClientUseCase,
            useFactory: (repo, credsRepo, jwtGen, encryptor, configRepo, smtpRepo, tmpService, mailerService, appConfig) => new RegisterClientUseCase(repo, credsRepo, jwtGen, encryptor, configRepo, smtpRepo, tmpService, mailerService, appConfig),
            inject: [CLIENT_REPOSITORY, CLIENT_CREDENTIALS_REPOSITORY, JWT_GENERATOR, ENCRYPTER, NEXLIFY_CONFIGURATION_REPOSITORY, SMTP_SERVER_REPOSITORY, TEMPLATE_SERVICE, MAILER_SERVICE, APP_CONFIG]
        },
        {
            provide: AuthAdminUserUseCase,
            useFactory: (repo, hasher, jwtGen, encrypterGen, appConfig) => new AuthAdminUserUseCase(repo, hasher, jwtGen, encrypterGen, appConfig),
            inject: [ADMIN_USER_REPOSITORY, PASSWORD_HASHER, JWT_GENERATOR, ENCRYPTER, APP_CONFIG],
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
            provide: EmailAttemptService,
            useFactory: (configRepo, smtpRepo, emailsRepo, logsRepo, service, webhookEndpointsRepo, webhookDeliveriesRepo) => new EmailAttemptService(configRepo, smtpRepo, emailsRepo, logsRepo, service, webhookEndpointsRepo, webhookDeliveriesRepo),
            inject: [NEXLIFY_CONFIGURATION_REPOSITORY, SMTP_SERVER_REPOSITORY, EMAILS_REPOSITORY, EMAIL_SEND_LOGS_REPOSITORY, MAILER_SERVICE, WEBHOOK_ENDPOINTS_REPOSITORY, WEBHOOK_DELIVERIES_REPOSITORY]
        },
        {
            provide: SendEmailUseCase,
            useFactory: (configRepo, emailsRepo, attemptService, idGen) => new SendEmailUseCase(configRepo, emailsRepo, attemptService, idGen),
            inject: [NEXLIFY_CONFIGURATION_REPOSITORY, EMAILS_REPOSITORY, EmailAttemptService, ID_GENERATOR]
        },
        {
            provide: GetEmailDetailUseCase,
            useFactory: (emailsRepo, logsRepo) => new GetEmailDetailUseCase(emailsRepo, logsRepo),
            inject: [EMAILS_REPOSITORY, EMAIL_SEND_LOGS_REPOSITORY]
        },
        {
            provide: GetEmailsUseCase,
            useFactory: (emailsRepo) => new GetEmailsUseCase(emailsRepo),
            inject: [EMAILS_REPOSITORY]
        },
        {
            provide: RetryEmailUseCase,
            useFactory: (emailsRepo, attemptService) => new RetryEmailUseCase(emailsRepo, attemptService),
            inject: [EMAILS_REPOSITORY, EmailAttemptService]
        },
        {
            provide: DiffuseEmailUseCase,
            useFactory: (configRepo, emailsRepo, idGen) => new DiffuseEmailUseCase(configRepo, emailsRepo, idGen),
            inject: [NEXLIFY_CONFIGURATION_REPOSITORY, EMAILS_REPOSITORY, ID_GENERATOR]
        },
        {
            provide: RetryDueEmailsUseCase,
            useFactory: (emailsRepo, attemptService, configRepo) => new RetryDueEmailsUseCase(emailsRepo, attemptService, configRepo),
            inject: [EMAILS_REPOSITORY, EmailAttemptService, NEXLIFY_CONFIGURATION_REPOSITORY]
        },
        {
            provide: EmailRetryScheduler,
            useFactory: (retryDue) => new EmailRetryScheduler(retryDue),
            inject: [RetryDueEmailsUseCase]
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
            useFactory: (cliRepo, credsRepo, keysRepo, keysLogRepo, jwtGen, encrypterGen, assignHasGen, passHasher, appConfig) => new AssignCredentialsUseCase(cliRepo, credsRepo, keysRepo, keysLogRepo, jwtGen, encrypterGen, assignHasGen, passHasher, appConfig),
            inject: [CLIENT_REPOSITORY, CLIENT_CREDENTIALS_REPOSITORY, NEXLIFY_KEYS_REPOSITORY, NEXLIFY_KEYS_LOGS_REPOSITORY, JWT_GENERATOR, ENCRYPTER, HASH_GENERATOR, PASSWORD_HASHER, APP_CONFIG]
        },
        {
            provide: SignInUseCase,
            useFactory: (credsRepo, cliRepo, hasher, jwtGen, encrypterGen, appConfig) => new SignInUseCase(credsRepo, cliRepo, hasher, jwtGen, encrypterGen, appConfig),
            inject: [CLIENT_CREDENTIALS_REPOSITORY, CLIENT_REPOSITORY, PASSWORD_HASHER, JWT_GENERATOR, ENCRYPTER, APP_CONFIG]
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
            provide: UpdateClientUseCase,
            useFactory: (context, cliRepo) => new UpdateClientUseCase(context, cliRepo),
            inject: [REQUEST_CONTEXT, CLIENT_REPOSITORY]
        },
        {
            provide: UpdateClientStateUseCase,
            useFactory: (context, cliRepo) => new UpdateClientStateUseCase(context, cliRepo),
            inject: [REQUEST_CONTEXT, CLIENT_REPOSITORY]
        },
        {
            provide: ForgotPasswordUseCase,
            useFactory: (credsRepo, cliRepo, jwtGen, encryptor, configRepo, smtpRepo, mailerService, appConfig) => new ForgotPasswordUseCase(credsRepo, cliRepo, jwtGen, encryptor, configRepo, smtpRepo, mailerService, appConfig),
            inject: [CLIENT_CREDENTIALS_REPOSITORY, CLIENT_REPOSITORY, JWT_GENERATOR, ENCRYPTER, NEXLIFY_CONFIGURATION_REPOSITORY, SMTP_SERVER_REPOSITORY, MAILER_SERVICE, APP_CONFIG]
        },
        {
            provide: ResetPasswordUseCase,
            useFactory: (encryptor, jwtGen, passHasher, credsRepo, appConfig) => new ResetPasswordUseCase(encryptor, jwtGen, passHasher, credsRepo, appConfig),
            inject: [ENCRYPTER, JWT_GENERATOR, PASSWORD_HASHER, CLIENT_CREDENTIALS_REPOSITORY, APP_CONFIG]
        },
        {
            provide: IdTypesUseCase,
            useFactory: (repo) => new IdTypesUseCase(repo),
            inject: [ID_TYPE_REPOSITORY]
        },
        {
            provide: CreateUserUseCase,
            useFactory: (context, usersRepo) => new CreateUserUseCase(context, usersRepo),
            inject: [REQUEST_CONTEXT, USERS_REPOSITORY]
        },
        {
            provide: GetUsersUseCase,
            useFactory: (context, usersRepo) => new GetUsersUseCase(context, usersRepo),
            inject: [REQUEST_CONTEXT, USERS_REPOSITORY]
        },
        {
            provide: UpdateUserUseCase,
            useFactory: (context, usersRepo) => new UpdateUserUseCase(context, usersRepo),
            inject: [REQUEST_CONTEXT, USERS_REPOSITORY]
        },
        {
            provide: CreateTemplateUseCase,
            useFactory: (context, templatesRepo) => new CreateTemplateUseCase(context, templatesRepo),
            inject: [REQUEST_CONTEXT, TEMPLATES_REPOSITORY]
        },
        {
            provide: GetTemplatesUseCase,
            useFactory: (context, templatesRepo) => new GetTemplatesUseCase(context, templatesRepo),
            inject: [REQUEST_CONTEXT, TEMPLATES_REPOSITORY]
        },
        {
            provide: UpdateTemplateUseCase,
            useFactory: (context, templatesRepo) => new UpdateTemplateUseCase(context, templatesRepo),
            inject: [REQUEST_CONTEXT, TEMPLATES_REPOSITORY]
        },
        {
            provide: RegisterWebhookEndpointUseCase,
            useFactory: (context, webhookEndpointsRepo) => new RegisterWebhookEndpointUseCase(context, webhookEndpointsRepo),
            inject: [REQUEST_CONTEXT, WEBHOOK_ENDPOINTS_REPOSITORY]
        },
        {
            provide: ListMyWebhookEndpointsUseCase,
            useFactory: (context, webhookEndpointsRepo) => new ListMyWebhookEndpointsUseCase(context, webhookEndpointsRepo),
            inject: [REQUEST_CONTEXT, WEBHOOK_ENDPOINTS_REPOSITORY]
        },
        {
            provide: UpdateWebhookEndpointUseCase,
            useFactory: (context, webhookEndpointsRepo) => new UpdateWebhookEndpointUseCase(context, webhookEndpointsRepo),
            inject: [REQUEST_CONTEXT, WEBHOOK_ENDPOINTS_REPOSITORY]
        },
        {
            provide: WebhookDeliveryScheduler,
            useFactory: (webhookDeliveriesRepo, webhookEndpointsRepo, emailsRepo, httpDeliveryService) => new WebhookDeliveryScheduler(webhookDeliveriesRepo, webhookEndpointsRepo, emailsRepo, httpDeliveryService),
            inject: [WEBHOOK_DELIVERIES_REPOSITORY, WEBHOOK_ENDPOINTS_REPOSITORY, EMAILS_REPOSITORY, HTTP_DELIVERY_SERVICE]
        }

    ]
})

export class ControllerModule { }
