import { AdminUserRepository } from './admin-user.repository';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientRepository } from './client.repository';
import { NexlifyConfigurationRepository } from './nexlify-configuration.repository';
import { SmtpServerRepository } from './smtp-server.repository';
import { ADMIN_USER_REPOSITORY, CLIENT_REPOSITORY, NEXLIFY_CONFIGURATION_REPOSITORY, SMTP_SERVER_REPOSITORY } from 'src/core/application/contracts/persistence';

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
        }
    ],
    exports: [ADMIN_USER_REPOSITORY, CLIENT_REPOSITORY, SMTP_SERVER_REPOSITORY, NEXLIFY_CONFIGURATION_REPOSITORY],
})
export class RepositoriesModule { }
