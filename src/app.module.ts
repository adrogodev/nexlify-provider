import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RepositoriesModule } from './infrastructure/repositories/repositories.module';
import { ControllerModule } from './presentation/controllers/controller.module';
import { ServicesModule } from './infrastructure/services/service.module';

@Module({
    imports: [
        // Brute-force protection for the public authentication routes (applied per route with ThrottlerGuard).
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
        PrismaModule,
        RepositoriesModule,
        ControllerModule,
        ServicesModule,
    ],
})
export class AppModule { }
