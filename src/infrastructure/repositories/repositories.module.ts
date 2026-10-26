import { IdTypeRepository } from './id-type.repository';
import { EmailSendLogsRepository } from './email-send-logs.repository';
import { EmailsRepository } from './emails.repository';
import { AdminUserRepository } from './admin-user.repository';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientRepository } from './client.repository';
import { NexlifyConfigurationRepository } from './nexlify-configuration.repository';
import { SmtpServerRepository } from './smtp-server.repository';
import { ADMIN_USER_REPOSITORY, CLIENT_CREDENTIALS_REPOSITORY, CLIENT_REPOSITORY, EMAIL_SEND_LOGS_REPOSITORY, EMAILS_REPOSITORY, ID_TYPE_REPOSITORY, NEXLIFY_CONFIGURATION_REPOSITORY, NEXLIFY_KEYS_LOGS_REPOSITORY, NEXLIFY_KEYS_REPOSITORY, SMTP_SERVER_REPOSITORY, TEMPLATES_REPOSITORY, USERS_REPOSITORY } from 'src/core/application/contracts/persistence';
import { ClientCredentialsRepository } from './client_credentials.repository';
import { NexlifyKeysRepository } from './nexlify-keys.repository';
import { NexlifyKeysLogsRepository } from './nexlify-keys-logs.repository';
import { UsersRepository } from './users.repository';
import { TemplatesRepository } from './templates.repository';

@Module({
    imports: [PrismaModule],
    providers: [
        {
            provide: ADMIN_USER_REPOSITORY,
            useClass: AdminUserRepository,
        },
        {
            provide: CLIENT_REPOSITORY,
            useClass: ClientRepository
        },
        {
            provide: SMTP_SERVER_REPOSITORY,
            useClass: SmtpServerRepository
        },
        {
            provide: NEXLIFY_CONFIGURATION_REPOSITORY,
            useClass: NexlifyConfigurationRepository
        },
        {
            provide: CLIENT_CREDENTIALS_REPOSITORY,
            useClass: ClientCredentialsRepository
        },
        {
            provide: NEXLIFY_KEYS_REPOSITORY,
            useClass: NexlifyKeysRepository
        },
        {
            provide: NEXLIFY_KEYS_LOGS_REPOSITORY,
            useClass: NexlifyKeysLogsRepository
        },
        {
            provide: ID_TYPE_REPOSITORY,
            useClass: IdTypeRepository
        },
        {
            provide: EMAILS_REPOSITORY,
            useClass: EmailsRepository
        },
        {
            provide: EMAIL_SEND_LOGS_REPOSITORY,
            useClass: EmailSendLogsRepository
        },
        {
            provide: USERS_REPOSITORY,
            useClass: UsersRepository
        },
        {
            provide: TEMPLATES_REPOSITORY,
            useClass: TemplatesRepository
        },
    ],
    exports: [
        ADMIN_USER_REPOSITORY,
        CLIENT_REPOSITORY,
        SMTP_SERVER_REPOSITORY,
        NEXLIFY_CONFIGURATION_REPOSITORY,
        CLIENT_CREDENTIALS_REPOSITORY,
        NEXLIFY_KEYS_REPOSITORY,
        NEXLIFY_KEYS_LOGS_REPOSITORY,
        ID_TYPE_REPOSITORY,
        EMAILS_REPOSITORY,
        EMAIL_SEND_LOGS_REPOSITORY,
        USERS_REPOSITORY,
        TEMPLATES_REPOSITORY
    ],
})

export class RepositoriesModule { }
