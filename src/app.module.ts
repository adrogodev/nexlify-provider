import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RepositoriesModule } from './infrastructure/repositories/repositories.module';
import { AdminUserModule } from './presentation/controllers/admin-user/admin-user.module';

@Module({
    imports: [PrismaModule, RepositoriesModule, AdminUserModule],
})
export class AppModule {}

