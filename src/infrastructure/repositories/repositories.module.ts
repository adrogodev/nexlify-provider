import { Module } from '@nestjs/common';
import { ADMIN_USER_REPOSITORY, CLIENT_REPOSITORY } from 'src/core/application/contracts/persistence';
import { SMTP_SERVER_REPOSITORY } from 'src/core/application/contracts/persistence/smtp-server.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminUserRepository } from './admin-user.repository';
import { ClientRepository } from './client.repository';
import { SmtpServerRepository } from './smtp-server.repository';

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
        }
    ],
    exports: [ADMIN_USER_REPOSITORY, CLIENT_REPOSITORY, SMTP_SERVER_REPOSITORY],
})
export class RepositoriesModule { }
