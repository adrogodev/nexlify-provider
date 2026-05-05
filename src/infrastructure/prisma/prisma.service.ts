import {
    Injectable,
    type OnModuleInit,
    type OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    constructor() {
        super({
            adapter: new PrismaPg({
                connectionString: String(process.env.DATABASE_URL),
            }),
        });
    }

    async onModuleInit() {
        try {
            await this.$connect();
        } catch (error) {
            throw new Error(`Error de conexión a la base de datos: ${error}`);
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
