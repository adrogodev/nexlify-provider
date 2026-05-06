import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ADMIN_USER_REPOSITORY } from '../../core/application/contracts/persistence/admin-user.repository';
import { AdminUserRepository } from './admin-user.repository';

@Module({
    imports: [PrismaModule],
    providers: [
        {
            provide: ADMIN_USER_REPOSITORY,
            useClass: AdminUserRepository,
        },
    ],
    exports: [ADMIN_USER_REPOSITORY],
})
export class RepositoriesModule {}
