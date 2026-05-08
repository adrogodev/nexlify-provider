import { AdminUserRepository } from './admin-user.repository';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientRepository } from './client.repository';
import { SmtpServerRepository } from './smtp-server.repository';
import { ADMIN_USER_REPOSITORY, CLIENT_REPOSITORY, SMTP_SERVER_REPOSITORY } from 'src/core/application/contracts/persistence';

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
