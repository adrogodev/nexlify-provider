import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RepositoriesModule } from './infrastructure/repositories/repositories.module';

@Module({
    imports: [PrismaModule, RepositoriesModule],
})
export class AppModule {}

