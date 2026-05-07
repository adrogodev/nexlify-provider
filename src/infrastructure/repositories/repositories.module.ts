import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminUserRepository } from './admin-user.repository';
import { ADMIN_USER_REPOSITORY, CLIENT_REPOSITORY } from 'src/core/application/contracts/persistence';
import { ClientRepository } from './client.repository';

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
        }
    ],
    exports: [ADMIN_USER_REPOSITORY, CLIENT_REPOSITORY],
})
export class RepositoriesModule { }
