import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RepositoriesModule } from './infrastructure/repositories/repositories.module';
import { ControllerModule } from './presentation/controllers/controller.module';
import { ServicesModule } from './infrastructure/services/service.module';

@Module({
    imports: [PrismaModule, RepositoriesModule, ControllerModule, ServicesModule],
})
export class AppModule { }
