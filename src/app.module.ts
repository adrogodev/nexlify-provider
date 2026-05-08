import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RepositoriesModule } from './infrastructure/repositories/repositories.module';
import { AdminUserModule } from './presentation/controllers/admin-user/admin-user.module';
import { ClientModule } from './presentation/controllers/client/client.module';

@Module({
    imports: [
        PrismaModule,
        RepositoriesModule,
        AdminUserModule,
        ClientModule
    ],
})
export class AppModule { }

