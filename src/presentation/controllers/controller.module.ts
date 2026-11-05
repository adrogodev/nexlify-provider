import { colors } from '@gamastudio/colorslog';
import { Module } from '@nestjs/common';
import {
    APP_CONFIG,
    ENCRYPTER,
    HASH_GENERATOR,
    ID_GENERATOR,
    JWT_GENERATOR,
    PASSWORD_HASHER,
    REQUEST_CONTEXT,
    WEBHOOK_SIGNER,
} from 'src/core/application/contracts/infrastructure';
import {
    ADMIN_USER_REPOSITORY,
    CLIENT_CREDENTIALS_REPOSITORY,
    CLIENT_REPOSITORY,
    EMAILS_REPOSITORY,
    EMAIL_ATTACHMENTS_REPOSITORY,
    EMAIL_EVENT_SUBSCRIPTIONS_REPOSITORY,
    EMAIL_SEND_LOGS_REPOSITORY,
    ID_TYPE_REPOSITORY,
    NEXLIFY_CONFIGURATION_REPOSITORY,
    NEXLIFY_KEYS_LOGS_REPOSITORY,
    NEXLIFY_KEYS_REPOSITORY,
    SENDING_DOMAINS_REPOSITORY,
    SMTP_SERVER_REPOSITORY,
    SUPPRESSIONS_REPOSITORY,
    WEBHOOK_DELIVERIES_REPOSITORY,
    WEBHOOK_ENDPOINTS_REPOSITORY,
    EMAIL_CERTIFICATES_REPOSITORY,
    EMAIL_STATS_REPOSITORY,
    UNSUBSCRIBE_SUPPRESSIONS_REPOSITORY,
} from 'src/core/application/contracts/persistence';
import {
    TEMPLATES_REPOSITORY,
    USERS_REPOSITORY,
} from 'src/core/application/contracts/persistence';
import {
    CERTIFICATE_PDF_RENDERER,
    DKIM_KEY_GENERATOR,
    DNS_RESOLVER,
    HTTP_DELIVERY_SERVICE,
    MAILER_SERVICE,
    REPLY_ANALYZER,
    UNSUBSCRIBE_TOKEN_SERVICE,
} from 'src/core/application/contracts/services';
import { TEMPLATE_SERVICE } from 'src/core/application/contracts/services/template.service';
import {
    AuthAdminUserUseCase,
    UserDataUseCase,
} from 'src/core/application/use-cases/admin-user';
import {
    AssignCredentialsUseCase,
    ClientDataUseCase,
    GetAllClientsUseCase,
    RegisterClientUseCase,
    SignInUseCase,
} from 'src/core/application/use-cases/clients';
import { ClientDetailUseCase } from 'src/core/application/use-cases/clients/client-detail';
import { ForgotPasswordUseCase } from 'src/core/application/use-cases/clients/forgot-password';
import { ResetPasswordUseCase } from 'src/core/application/use-cases/clients/reset-password';
import { UpdateClientUseCase } from 'src/core/application/use-cases/clients/update-client';
import { UpdateClientStateUseCase } from 'src/core/application/use-cases/clients/update-client-state';
import { CreateSubscriptionUseCase } from 'src/core/application/use-cases/email-event-subscriptions/create-subscription/create-subscription.usecase';
import { GetMySubscriptionsUseCase } from 'src/core/application/use-cases/email-event-subscriptions/get-my-subscriptions/get-my-subscriptions.usecase';
import { UpdateSubscriptionUseCase } from 'src/core/application/use-cases/email-event-subscriptions/update-subscription/update-subscription.usecase';
import { DiffuseEmailUseCase } from 'src/core/application/use-cases/email/diffuse-email/diffuse-email.usecase';
import { DownloadEmailAttachmentUseCase } from 'src/core/application/use-cases/email/get-email-detail/download-email-attachment.usecase';
import { GetEmailDetailUseCase } from 'src/core/application/use-cases/email/get-email-detail/get-email-detail.usecase';
import { GetEmailsUseCase } from 'src/core/application/use-cases/email/get-emails/get-emails.usecase';
import { InboundEmailUseCase } from 'src/core/application/use-cases/email/inbound-email/inbound-email.usecase';
import { RetryDueEmailsUseCase } from 'src/core/application/use-cases/email/retry-due/retry-due-emails.usecase';
import { RetryEmailUseCase } from 'src/core/application/use-cases/email/retry-email/retry-email.usecase';
import { SendEmailUseCase } from 'src/core/application/use-cases/email/send-email/send-email.usecase';
import { DeliverabilityService } from 'src/core/application/use-cases/email/services/deliverability.service';
import { EmailAttemptService } from 'src/core/application/use-cases/email/services/email-attempt.service';
import { TemplateContentService } from 'src/core/application/use-cases/email/services/template-content.service';
import { ReplyWebhookFanOutService } from 'src/core/application/use-cases/email/services/reply-webhook-fanout.service';
import {
    AnalyzeEmailUseCase,
    GetAiStatusUseCase,
    ReplyAnalysisService,
} from 'src/core/application/use-cases/email/analyze-reply';
import {
    GetCertificatePdfUseCase,
    GetCertificateUseCase,
    IssueCertificateUseCase,
    VerifyCertificateUseCase,
} from 'src/core/application/use-cases/certificates';
import { GetStatsOverviewUseCase } from 'src/core/application/use-cases/stats';
import { IdTypesUseCase } from 'src/core/application/use-cases/master';
import {
    AddNexlifyConfigurationUseCase,
    GetNexlifyConfigurationUseCase,
    UpdateNexlifyConfigurationUseCase,
} from 'src/core/application/use-cases/nexlify-configuration';
import {
    GenerateNexlifyKeyUseCase,
    ListMyNexlifyKeysUseCase,
    RevokeNexlifyKeyUseCase,
} from 'src/core/application/use-cases/nexlify-keys';
import {
    DeleteSendingDomainUseCase,
    ListSendingDomainsUseCase,
    RegisterSendingDomainUseCase,
    SpfPolicyService,
    VerifySendingDomainUseCase,
} from 'src/core/application/use-cases/sending-domains';
import { AddSmtpServerUseCase } from 'src/core/application/use-cases/smtp-server';
import {
    AddSuppressionUseCase,
    ListSuppressionsUseCase,
    ProcessBounceUseCase,
    RemoveSuppressionUseCase,
    SuppressionService,
    UnsubscribeUseCase,
} from 'src/core/application/use-cases/suppressions';
import {
    CreateTemplateUseCase,
    GetTemplatesUseCase,
    UpdateTemplateUseCase,
} from 'src/core/application/use-cases/templates';
import {
    CreateUserUseCase,
    GetUsersUseCase,
    UpdateUserUseCase,
} from 'src/core/application/use-cases/users';
import { VerifyCredentialAssignmentTokenUseCase } from 'src/core/application/use-cases/verify';
import {
    ListMyWebhookEndpointsUseCase,
    ListWebhookDeliveriesUseCase,
    RedeliverWebhookDeliveryUseCase,
    RegisterWebhookEndpointUseCase,
    TestWebhookEndpointUseCase,
    UpdateWebhookEndpointUseCase,
} from 'src/core/application/use-cases/webhooks';
import {
    ApiKeyGuard,
    AuthGuard,
    ConfigurationExistsGuard,
    EmailAuthGuard,
    SmtpServerExistsGuard,
} from 'src/infrastructure/guards';
import { HelpersModule } from 'src/infrastructure/helpers/helpers.module';
import { RepositoriesModule } from 'src/infrastructure/repositories/repositories.module';
import { SecurityModule } from 'src/infrastructure/security';
import { EmailRetryScheduler } from 'src/infrastructure/services/email-retry.scheduler.service';
import { InboundWebhookSecurityService } from 'src/infrastructure/services/inbound-webhook.security';
import { ServicesModule } from 'src/infrastructure/services/service.module';
import { WebhookDeliveryScheduler } from 'src/infrastructure/services/webhook-delivery.scheduler.service';
import { AdminUserController } from './admin-user.controller';
import { ClientContoller } from './client.controller';
import { EmailEventSubscriptionsController } from './email-event-subscriptions.controller';
import { EmailBounceController } from './email-bounce.controller';
import { EmailController } from './email.controller';
import { EmailIntelligenceController } from './email-intelligence.controller';
import { AiController, CertificatesController, StatsController } from './insights.controller';
import { InboundEmailController } from './inbound-email.controller';
import { MasterController } from './master.controller';
import { NexlifyConfigurationController } from './nexlify-configuration.controller';
import { NexlifyKeysController } from './nexlify-keys.controller';
import { SendingDomainsController } from './sending-domains.controller';
import { SmtpServerController } from './smtp-server.controller';
import { SuppressionsController } from './suppressions.controller';
import { TemplatesController } from './templates.controller';
import { UnsubscribeController } from './unsubscribe.controller';
import { UsersController } from './users.controller';
import { VerifyController } from './verify.controller';
import { WebhooksController } from './webhooks.controller';

@Module({
    imports: [
        RepositoriesModule,
        HelpersModule,
        SecurityModule,
        ServicesModule,
    ],
    controllers: [
        AdminUserController,
        ClientContoller,
        SmtpServerController,
        EmailController,
        NexlifyConfigurationController,
        VerifyController,
        InboundEmailController,
        MasterController,
        NexlifyKeysController,
        UsersController,
        TemplatesController,
        WebhooksController,
        EmailEventSubscriptionsController,
        // S4/S5 (send pipeline)
        SendingDomainsController,
        SuppressionsController,
        EmailBounceController,
        UnsubscribeController,
        EmailIntelligenceController,
        StatsController,
        AiController,
        CertificatesController,
    ],
    providers: [
        AuthGuard,
        {
            provide: ApiKeyGuard,
            useFactory: (keysRepo, hashGen) =>
                new ApiKeyGuard(keysRepo, hashGen),
            inject: [NEXLIFY_KEYS_REPOSITORY, HASH_GENERATOR],
        },
        {
            provide: EmailAuthGuard,
            useFactory: (apiKeyGuard, authGuard) =>
                new EmailAuthGuard(apiKeyGuard, authGuard),
            inject: [ApiKeyGuard, AuthGuard],
        },
        ConfigurationExistsGuard,
        SmtpServerExistsGuard,
        {
            provide: GenerateNexlifyKeyUseCase,
            useFactory: (context, keysRepo, hashGen) =>
                new GenerateNexlifyKeyUseCase(context, keysRepo, hashGen),
            inject: [REQUEST_CONTEXT, NEXLIFY_KEYS_REPOSITORY, HASH_GENERATOR],
        },
        {
            provide: ListMyNexlifyKeysUseCase,
            useFactory: (context, keysRepo) =>
                new ListMyNexlifyKeysUseCase(context, keysRepo),
            inject: [REQUEST_CONTEXT, NEXLIFY_KEYS_REPOSITORY],
        },
        {
            provide: RevokeNexlifyKeyUseCase,
            useFactory: (context, keysRepo) =>
                new RevokeNexlifyKeyUseCase(context, keysRepo),
            inject: [REQUEST_CONTEXT, NEXLIFY_KEYS_REPOSITORY],
        },
        {
            provide: RegisterClientUseCase,
            useFactory: (
                repo,
                credsRepo,
                jwtGen,
                encryptor,
                configRepo,
                smtpRepo,
                tmpService,
                mailerService,
                appConfig,
            ) =>
                new RegisterClientUseCase(
                    repo,
                    credsRepo,
                    jwtGen,
                    encryptor,
                    configRepo,
                    smtpRepo,
                    tmpService,
                    mailerService,
                    appConfig,
                ),
            inject: [
                CLIENT_REPOSITORY,
                CLIENT_CREDENTIALS_REPOSITORY,
                JWT_GENERATOR,
                ENCRYPTER,
                NEXLIFY_CONFIGURATION_REPOSITORY,
                SMTP_SERVER_REPOSITORY,
                TEMPLATE_SERVICE,
                MAILER_SERVICE,
                APP_CONFIG,
            ],
        },
        {
            provide: AuthAdminUserUseCase,
            useFactory: (repo, hasher, jwtGen, encrypterGen, appConfig) =>
                new AuthAdminUserUseCase(
                    repo,
                    hasher,
                    jwtGen,
                    encrypterGen,
                    appConfig,
                ),
            inject: [
                ADMIN_USER_REPOSITORY,
                PASSWORD_HASHER,
                JWT_GENERATOR,
                ENCRYPTER,
                APP_CONFIG,
            ],
        },
        {
            provide: UserDataUseCase,
            useFactory: (context, repo) => new UserDataUseCase(context, repo),
            inject: [REQUEST_CONTEXT, ADMIN_USER_REPOSITORY],
        },
        {
            provide: AddSmtpServerUseCase,
            useFactory: (repo) => new AddSmtpServerUseCase(repo),
            inject: [SMTP_SERVER_REPOSITORY],
        },
        {
            provide: EmailAttemptService,
            useFactory: (
                configRepo,
                smtpRepo,
                emailsRepo,
                logsRepo,
                service,
                webhookEndpointsRepo,
                webhookDeliveriesRepo,
                deliverability,
            ) =>
                new EmailAttemptService(
                    configRepo,
                    smtpRepo,
                    emailsRepo,
                    logsRepo,
                    service,
                    webhookEndpointsRepo,
                    webhookDeliveriesRepo,
                    deliverability,
                ),
            inject: [
                NEXLIFY_CONFIGURATION_REPOSITORY,
                SMTP_SERVER_REPOSITORY,
                EMAILS_REPOSITORY,
                EMAIL_SEND_LOGS_REPOSITORY,
                MAILER_SERVICE,
                WEBHOOK_ENDPOINTS_REPOSITORY,
                WEBHOOK_DELIVERIES_REPOSITORY,
                DeliverabilityService,
            ],
        },
        {
            provide: SendEmailUseCase,
            useFactory: (
                configRepo,
                emailsRepo,
                attemptService,
                idGen,
                templateContent,
            ) =>
                new SendEmailUseCase(
                    configRepo,
                    emailsRepo,
                    attemptService,
                    idGen,
                    templateContent,
                ),
            inject: [
                NEXLIFY_CONFIGURATION_REPOSITORY,
                EMAILS_REPOSITORY,
                EmailAttemptService,
                ID_GENERATOR,
                TemplateContentService,
            ],
        },
        {
            provide: ReplyWebhookFanOutService,
            useFactory: (attachmentsRepo, subscriptionsRepo, webhookDeliveriesRepo) =>
                new ReplyWebhookFanOutService(
                    attachmentsRepo,
                    subscriptionsRepo,
                    webhookDeliveriesRepo,
                ),
            inject: [
                EMAIL_ATTACHMENTS_REPOSITORY,
                EMAIL_EVENT_SUBSCRIPTIONS_REPOSITORY,
                WEBHOOK_DELIVERIES_REPOSITORY,
            ],
        },
        {
            provide: ReplyAnalysisService,
            useFactory: (replyAnalyzer, emailsRepo, suppressionsRepo, fanOut) =>
                new ReplyAnalysisService(
                    replyAnalyzer,
                    emailsRepo,
                    suppressionsRepo,
                    fanOut,
                    (message: string) => colors.error(message, { dateShow: false }),
                ),
            inject: [
                REPLY_ANALYZER,
                EMAILS_REPOSITORY,
                UNSUBSCRIBE_SUPPRESSIONS_REPOSITORY,
                ReplyWebhookFanOutService,
            ],
        },
        {
            provide: InboundEmailUseCase,
            useFactory: (emailsRepo, attachmentsRepo, idGen, fanOut, replyAnalysis) =>
                new InboundEmailUseCase(
                    emailsRepo,
                    attachmentsRepo,
                    idGen,
                    fanOut,
                    replyAnalysis,
                ),
            inject: [
                EMAILS_REPOSITORY,
                EMAIL_ATTACHMENTS_REPOSITORY,
                ID_GENERATOR,
                ReplyWebhookFanOutService,
                ReplyAnalysisService,
            ],
        },
        {
            provide: AnalyzeEmailUseCase,
            useFactory: (context, emailsRepo, replyAnalysis) =>
                new AnalyzeEmailUseCase(context, emailsRepo, replyAnalysis),
            inject: [REQUEST_CONTEXT, EMAILS_REPOSITORY, ReplyAnalysisService],
        },
        {
            provide: GetAiStatusUseCase,
            useFactory: (replyAnalyzer) => new GetAiStatusUseCase(replyAnalyzer),
            inject: [REPLY_ANALYZER],
        },
        {
            provide: GetStatsOverviewUseCase,
            useFactory: (context, statsRepo, emailsRepo, configRepo, replyAnalyzer) =>
                new GetStatsOverviewUseCase(
                    context,
                    statsRepo,
                    emailsRepo,
                    configRepo,
                    replyAnalyzer,
                ),
            inject: [
                REQUEST_CONTEXT,
                EMAIL_STATS_REPOSITORY,
                EMAILS_REPOSITORY,
                NEXLIFY_CONFIGURATION_REPOSITORY,
                REPLY_ANALYZER,
            ],
        },
        {
            provide: IssueCertificateUseCase,
            useFactory: (context, emailsRepo, logsRepo, certificatesRepo, hashGen, idGen, appConfig) =>
                new IssueCertificateUseCase(
                    context,
                    emailsRepo,
                    logsRepo,
                    certificatesRepo,
                    hashGen,
                    idGen,
                    appConfig,
                ),
            inject: [
                REQUEST_CONTEXT,
                EMAILS_REPOSITORY,
                EMAIL_SEND_LOGS_REPOSITORY,
                EMAIL_CERTIFICATES_REPOSITORY,
                HASH_GENERATOR,
                ID_GENERATOR,
                APP_CONFIG,
            ],
        },
        {
            provide: GetCertificateUseCase,
            useFactory: (context, emailsRepo, certificatesRepo, appConfig) =>
                new GetCertificateUseCase(context, emailsRepo, certificatesRepo, appConfig),
            inject: [REQUEST_CONTEXT, EMAILS_REPOSITORY, EMAIL_CERTIFICATES_REPOSITORY, APP_CONFIG],
        },
        {
            provide: GetCertificatePdfUseCase,
            useFactory: (context, emailsRepo, certificatesRepo, pdfRenderer, appConfig) =>
                new GetCertificatePdfUseCase(
                    context,
                    emailsRepo,
                    certificatesRepo,
                    pdfRenderer,
                    appConfig,
                ),
            inject: [
                REQUEST_CONTEXT,
                EMAILS_REPOSITORY,
                EMAIL_CERTIFICATES_REPOSITORY,
                CERTIFICATE_PDF_RENDERER,
                APP_CONFIG,
            ],
        },
        {
            provide: VerifyCertificateUseCase,
            useFactory: (certificatesRepo, emailsRepo, hashGen) =>
                new VerifyCertificateUseCase(certificatesRepo, emailsRepo, hashGen),
            inject: [EMAIL_CERTIFICATES_REPOSITORY, EMAILS_REPOSITORY, HASH_GENERATOR],
        },
        {
            provide: InboundWebhookSecurityService,
            useClass: InboundWebhookSecurityService,
        },
        {
            provide: GetEmailDetailUseCase,
            useFactory: (emailsRepo, logsRepo, attachmentsRepo) =>
                new GetEmailDetailUseCase(
                    emailsRepo,
                    logsRepo,
                    attachmentsRepo,
                ),
            inject: [
                EMAILS_REPOSITORY,
                EMAIL_SEND_LOGS_REPOSITORY,
                EMAIL_ATTACHMENTS_REPOSITORY,
            ],
        },
        {
            provide: DownloadEmailAttachmentUseCase,
            useFactory: (emailsRepo, attachmentsRepo) =>
                new DownloadEmailAttachmentUseCase(emailsRepo, attachmentsRepo),
            inject: [EMAILS_REPOSITORY, EMAIL_ATTACHMENTS_REPOSITORY],
        },
        {
            provide: GetEmailsUseCase,
            useFactory: (emailsRepo) => new GetEmailsUseCase(emailsRepo),
            inject: [EMAILS_REPOSITORY],
        },
        {
            provide: RetryEmailUseCase,
            useFactory: (emailsRepo, attemptService) =>
                new RetryEmailUseCase(emailsRepo, attemptService),
            inject: [EMAILS_REPOSITORY, EmailAttemptService],
        },
        {
            provide: DiffuseEmailUseCase,
            useFactory: (configRepo, emailsRepo, idGen, templateContent) =>
                new DiffuseEmailUseCase(
                    configRepo,
                    emailsRepo,
                    idGen,
                    templateContent,
                ),
            inject: [
                NEXLIFY_CONFIGURATION_REPOSITORY,
                EMAILS_REPOSITORY,
                ID_GENERATOR,
                TemplateContentService,
            ],
        },
        {
            provide: RetryDueEmailsUseCase,
            useFactory: (emailsRepo, attemptService, configRepo) =>
                new RetryDueEmailsUseCase(
                    emailsRepo,
                    attemptService,
                    configRepo,
                ),
            inject: [
                EMAILS_REPOSITORY,
                EmailAttemptService,
                NEXLIFY_CONFIGURATION_REPOSITORY,
            ],
        },
        {
            provide: EmailRetryScheduler,
            useFactory: (retryDue) => new EmailRetryScheduler(retryDue),
            inject: [RetryDueEmailsUseCase],
        },
        {
            provide: AddNexlifyConfigurationUseCase,
            useFactory: (repo, smtpRepo) =>
                new AddNexlifyConfigurationUseCase(repo, smtpRepo),
            inject: [NEXLIFY_CONFIGURATION_REPOSITORY, SMTP_SERVER_REPOSITORY],
        },
        {
            provide: GetNexlifyConfigurationUseCase,
            useFactory: (configurationRepo, SmtpRepo) =>
                new GetNexlifyConfigurationUseCase(configurationRepo, SmtpRepo),
            inject: [NEXLIFY_CONFIGURATION_REPOSITORY, SMTP_SERVER_REPOSITORY],
        },
        {
            provide: UpdateNexlifyConfigurationUseCase,
            useFactory: (repo) => new UpdateNexlifyConfigurationUseCase(repo),
            inject: [NEXLIFY_CONFIGURATION_REPOSITORY],
        },
        {
            provide: VerifyCredentialAssignmentTokenUseCase,
            useFactory: (repo, jwtGen, encryptor, appConfig) =>
                new VerifyCredentialAssignmentTokenUseCase(
                    repo,
                    jwtGen,
                    encryptor,
                    appConfig,
                ),
            inject: [
                CLIENT_CREDENTIALS_REPOSITORY,
                JWT_GENERATOR,
                ENCRYPTER,
                APP_CONFIG,
            ],
        },
        {
            provide: AssignCredentialsUseCase,
            useFactory: (
                cliRepo,
                credsRepo,
                keysRepo,
                keysLogRepo,
                jwtGen,
                encrypterGen,
                assignHasGen,
                passHasher,
                appConfig,
            ) =>
                new AssignCredentialsUseCase(
                    cliRepo,
                    credsRepo,
                    keysRepo,
                    keysLogRepo,
                    jwtGen,
                    encrypterGen,
                    assignHasGen,
                    passHasher,
                    appConfig,
                ),
            inject: [
                CLIENT_REPOSITORY,
                CLIENT_CREDENTIALS_REPOSITORY,
                NEXLIFY_KEYS_REPOSITORY,
                NEXLIFY_KEYS_LOGS_REPOSITORY,
                JWT_GENERATOR,
                ENCRYPTER,
                HASH_GENERATOR,
                PASSWORD_HASHER,
                APP_CONFIG,
            ],
        },
        {
            provide: SignInUseCase,
            useFactory: (
                credsRepo,
                cliRepo,
                hasher,
                jwtGen,
                encrypterGen,
                appConfig,
            ) =>
                new SignInUseCase(
                    credsRepo,
                    cliRepo,
                    hasher,
                    jwtGen,
                    encrypterGen,
                    appConfig,
                ),
            inject: [
                CLIENT_CREDENTIALS_REPOSITORY,
                CLIENT_REPOSITORY,
                PASSWORD_HASHER,
                JWT_GENERATOR,
                ENCRYPTER,
                APP_CONFIG,
            ],
        },
        {
            provide: ClientDataUseCase,
            useFactory: (context, cliRepo, cliCredsRepo) =>
                new ClientDataUseCase(context, cliRepo, cliCredsRepo),
            inject: [
                REQUEST_CONTEXT,
                CLIENT_REPOSITORY,
                CLIENT_CREDENTIALS_REPOSITORY,
            ],
        },
        {
            provide: GetAllClientsUseCase,
            useFactory: (repo, idTypeRepo) =>
                new GetAllClientsUseCase(repo, idTypeRepo),
            inject: [CLIENT_REPOSITORY, ID_TYPE_REPOSITORY],
        },
        {
            provide: ClientDetailUseCase,
            useFactory: (cliRepo, cliCredsRepo, idTypeRepo) =>
                new ClientDetailUseCase(cliRepo, cliCredsRepo, idTypeRepo),
            inject: [
                CLIENT_REPOSITORY,
                CLIENT_CREDENTIALS_REPOSITORY,
                ID_TYPE_REPOSITORY,
            ],
        },
        {
            provide: UpdateClientUseCase,
            useFactory: (context, cliRepo) =>
                new UpdateClientUseCase(context, cliRepo),
            inject: [REQUEST_CONTEXT, CLIENT_REPOSITORY],
        },
        {
            provide: UpdateClientStateUseCase,
            useFactory: (context, cliRepo) =>
                new UpdateClientStateUseCase(context, cliRepo),
            inject: [REQUEST_CONTEXT, CLIENT_REPOSITORY],
        },
        {
            provide: ForgotPasswordUseCase,
            useFactory: (
                credsRepo,
                cliRepo,
                jwtGen,
                encryptor,
                configRepo,
                smtpRepo,
                mailerService,
                appConfig,
            ) =>
                new ForgotPasswordUseCase(
                    credsRepo,
                    cliRepo,
                    jwtGen,
                    encryptor,
                    configRepo,
                    smtpRepo,
                    mailerService,
                    appConfig,
                ),
            inject: [
                CLIENT_CREDENTIALS_REPOSITORY,
                CLIENT_REPOSITORY,
                JWT_GENERATOR,
                ENCRYPTER,
                NEXLIFY_CONFIGURATION_REPOSITORY,
                SMTP_SERVER_REPOSITORY,
                MAILER_SERVICE,
                APP_CONFIG,
            ],
        },
        {
            provide: ResetPasswordUseCase,
            useFactory: (encryptor, jwtGen, passHasher, credsRepo, appConfig) =>
                new ResetPasswordUseCase(
                    encryptor,
                    jwtGen,
                    passHasher,
                    credsRepo,
                    appConfig,
                ),
            inject: [
                ENCRYPTER,
                JWT_GENERATOR,
                PASSWORD_HASHER,
                CLIENT_CREDENTIALS_REPOSITORY,
                APP_CONFIG,
            ],
        },
        {
            provide: IdTypesUseCase,
            useFactory: (repo) => new IdTypesUseCase(repo),
            inject: [ID_TYPE_REPOSITORY],
        },
        {
            provide: CreateUserUseCase,
            useFactory: (context, usersRepo) =>
                new CreateUserUseCase(context, usersRepo),
            inject: [REQUEST_CONTEXT, USERS_REPOSITORY],
        },
        {
            provide: GetUsersUseCase,
            useFactory: (context, usersRepo) =>
                new GetUsersUseCase(context, usersRepo),
            inject: [REQUEST_CONTEXT, USERS_REPOSITORY],
        },
        {
            provide: UpdateUserUseCase,
            useFactory: (context, usersRepo) =>
                new UpdateUserUseCase(context, usersRepo),
            inject: [REQUEST_CONTEXT, USERS_REPOSITORY],
        },
        {
            provide: CreateTemplateUseCase,
            useFactory: (context, templatesRepo) =>
                new CreateTemplateUseCase(context, templatesRepo),
            inject: [REQUEST_CONTEXT, TEMPLATES_REPOSITORY],
        },
        {
            provide: GetTemplatesUseCase,
            useFactory: (context, templatesRepo) =>
                new GetTemplatesUseCase(context, templatesRepo),
            inject: [REQUEST_CONTEXT, TEMPLATES_REPOSITORY],
        },
        {
            provide: UpdateTemplateUseCase,
            useFactory: (context, templatesRepo) =>
                new UpdateTemplateUseCase(context, templatesRepo),
            inject: [REQUEST_CONTEXT, TEMPLATES_REPOSITORY],
        },
        {
            provide: RegisterWebhookEndpointUseCase,
            useFactory: (context, webhookEndpointsRepo) =>
                new RegisterWebhookEndpointUseCase(
                    context,
                    webhookEndpointsRepo,
                ),
            inject: [REQUEST_CONTEXT, WEBHOOK_ENDPOINTS_REPOSITORY],
        },
        {
            provide: ListMyWebhookEndpointsUseCase,
            useFactory: (context, webhookEndpointsRepo) =>
                new ListMyWebhookEndpointsUseCase(
                    context,
                    webhookEndpointsRepo,
                ),
            inject: [REQUEST_CONTEXT, WEBHOOK_ENDPOINTS_REPOSITORY],
        },
        {
            provide: UpdateWebhookEndpointUseCase,
            useFactory: (context, webhookEndpointsRepo) =>
                new UpdateWebhookEndpointUseCase(context, webhookEndpointsRepo),
            inject: [REQUEST_CONTEXT, WEBHOOK_ENDPOINTS_REPOSITORY],
        },
        {
            provide: ListWebhookDeliveriesUseCase,
            useFactory: (context, webhookEndpointsRepo, webhookDeliveriesRepo) =>
                new ListWebhookDeliveriesUseCase(
                    context,
                    webhookEndpointsRepo,
                    webhookDeliveriesRepo,
                ),
            inject: [
                REQUEST_CONTEXT,
                WEBHOOK_ENDPOINTS_REPOSITORY,
                WEBHOOK_DELIVERIES_REPOSITORY,
            ],
        },
        {
            provide: RedeliverWebhookDeliveryUseCase,
            useFactory: (context, webhookEndpointsRepo, webhookDeliveriesRepo) =>
                new RedeliverWebhookDeliveryUseCase(
                    context,
                    webhookEndpointsRepo,
                    webhookDeliveriesRepo,
                ),
            inject: [
                REQUEST_CONTEXT,
                WEBHOOK_ENDPOINTS_REPOSITORY,
                WEBHOOK_DELIVERIES_REPOSITORY,
            ],
        },
        {
            provide: TestWebhookEndpointUseCase,
            useFactory: (context, webhookEndpointsRepo, httpDeliveryService, webhookSigner) =>
                new TestWebhookEndpointUseCase(
                    context,
                    webhookEndpointsRepo,
                    httpDeliveryService,
                    webhookSigner,
                ),
            inject: [
                REQUEST_CONTEXT,
                WEBHOOK_ENDPOINTS_REPOSITORY,
                HTTP_DELIVERY_SERVICE,
                WEBHOOK_SIGNER,
            ],
        },
        {
            provide: CreateSubscriptionUseCase,
            useFactory: (context, webhookEndpointsRepo, subscriptionsRepo) =>
                new CreateSubscriptionUseCase(
                    context,
                    webhookEndpointsRepo,
                    subscriptionsRepo,
                ),
            inject: [
                REQUEST_CONTEXT,
                WEBHOOK_ENDPOINTS_REPOSITORY,
                EMAIL_EVENT_SUBSCRIPTIONS_REPOSITORY,
            ],
        },
        {
            provide: GetMySubscriptionsUseCase,
            useFactory: (context, subscriptionsRepo) =>
                new GetMySubscriptionsUseCase(context, subscriptionsRepo),
            inject: [REQUEST_CONTEXT, EMAIL_EVENT_SUBSCRIPTIONS_REPOSITORY],
        },
        {
            provide: UpdateSubscriptionUseCase,
            useFactory: (context, subscriptionsRepo) =>
                new UpdateSubscriptionUseCase(context, subscriptionsRepo),
            inject: [REQUEST_CONTEXT, EMAIL_EVENT_SUBSCRIPTIONS_REPOSITORY],
        },
        // ---- S2/S4/S5 (send pipeline) ----
        {
            provide: TemplateContentService,
            useFactory: (templatesRepo) =>
                new TemplateContentService(templatesRepo),
            inject: [TEMPLATES_REPOSITORY],
        },
        {
            provide: SuppressionService,
            useFactory: (suppressionsRepo) =>
                new SuppressionService(suppressionsRepo),
            inject: [SUPPRESSIONS_REPOSITORY],
        },
        {
            provide: DeliverabilityService,
            useFactory: (
                suppressionService,
                domainsRepo,
                encrypter,
                appConfig,
                unsubscribeTokens,
            ) =>
                new DeliverabilityService(
                    suppressionService,
                    domainsRepo,
                    encrypter,
                    appConfig,
                    unsubscribeTokens,
                ),
            inject: [
                SuppressionService,
                SENDING_DOMAINS_REPOSITORY,
                ENCRYPTER,
                APP_CONFIG,
                UNSUBSCRIBE_TOKEN_SERVICE,
            ],
        },
        {
            provide: SpfPolicyService,
            useFactory: (configRepo, smtpRepo) =>
                new SpfPolicyService(configRepo, smtpRepo),
            inject: [NEXLIFY_CONFIGURATION_REPOSITORY, SMTP_SERVER_REPOSITORY],
        },
        {
            provide: RegisterSendingDomainUseCase,
            useFactory: (
                context,
                domainsRepo,
                keyGen,
                encrypter,
                appConfig,
                spf,
            ) =>
                new RegisterSendingDomainUseCase(
                    context,
                    domainsRepo,
                    keyGen,
                    encrypter,
                    appConfig,
                    spf,
                ),
            inject: [
                REQUEST_CONTEXT,
                SENDING_DOMAINS_REPOSITORY,
                DKIM_KEY_GENERATOR,
                ENCRYPTER,
                APP_CONFIG,
                SpfPolicyService,
            ],
        },
        {
            provide: ListSendingDomainsUseCase,
            useFactory: (context, domainsRepo, spf) =>
                new ListSendingDomainsUseCase(context, domainsRepo, spf),
            inject: [
                REQUEST_CONTEXT,
                SENDING_DOMAINS_REPOSITORY,
                SpfPolicyService,
            ],
        },
        {
            provide: VerifySendingDomainUseCase,
            useFactory: (context, domainsRepo, dns, spf) =>
                new VerifySendingDomainUseCase(context, domainsRepo, dns, spf),
            inject: [
                REQUEST_CONTEXT,
                SENDING_DOMAINS_REPOSITORY,
                DNS_RESOLVER,
                SpfPolicyService,
            ],
        },
        {
            provide: DeleteSendingDomainUseCase,
            useFactory: (context, domainsRepo) =>
                new DeleteSendingDomainUseCase(context, domainsRepo),
            inject: [REQUEST_CONTEXT, SENDING_DOMAINS_REPOSITORY],
        },
        {
            provide: ListSuppressionsUseCase,
            useFactory: (context, suppressionsRepo, emailsRepo) =>
                new ListSuppressionsUseCase(
                    context,
                    suppressionsRepo,
                    emailsRepo,
                ),
            inject: [
                REQUEST_CONTEXT,
                SUPPRESSIONS_REPOSITORY,
                EMAILS_REPOSITORY,
            ],
        },
        {
            provide: AddSuppressionUseCase,
            useFactory: (context, suppressionService, emailsRepo) =>
                new AddSuppressionUseCase(
                    context,
                    suppressionService,
                    emailsRepo,
                ),
            inject: [REQUEST_CONTEXT, SuppressionService, EMAILS_REPOSITORY],
        },
        {
            provide: RemoveSuppressionUseCase,
            useFactory: (context, suppressionsRepo) =>
                new RemoveSuppressionUseCase(context, suppressionsRepo),
            inject: [REQUEST_CONTEXT, SUPPRESSIONS_REPOSITORY],
        },
        {
            provide: ProcessBounceUseCase,
            useFactory: (emailsRepo, logsRepo, suppressionService) =>
                new ProcessBounceUseCase(
                    emailsRepo,
                    logsRepo,
                    suppressionService,
                ),
            inject: [
                EMAILS_REPOSITORY,
                EMAIL_SEND_LOGS_REPOSITORY,
                SuppressionService,
            ],
        },
        {
            provide: UnsubscribeUseCase,
            useFactory: (unsubscribeTokens, suppressionService) =>
                new UnsubscribeUseCase(unsubscribeTokens, suppressionService),
            inject: [UNSUBSCRIBE_TOKEN_SERVICE, SuppressionService],
        },
        // ---- end S2/S4/S5 ----
        {
            provide: WebhookDeliveryScheduler,
            useFactory: (
                webhookDeliveriesRepo,
                webhookEndpointsRepo,
                emailsRepo,
                httpDeliveryService,
            ) =>
                new WebhookDeliveryScheduler(
                    webhookDeliveriesRepo,
                    webhookEndpointsRepo,
                    emailsRepo,
                    httpDeliveryService,
                ),
            inject: [
                WEBHOOK_DELIVERIES_REPOSITORY,
                WEBHOOK_ENDPOINTS_REPOSITORY,
                EMAILS_REPOSITORY,
                HTTP_DELIVERY_SERVICE,
            ],
        },
    ],
})
export class ControllerModule {}
