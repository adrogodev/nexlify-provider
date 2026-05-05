import { colors } from '@gamastudio/colorslog';
import { type INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cors from 'cors';
import helmet from 'helmet';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';

export class Server {
    readonly #logger = colors;
    readonly #prismaLogger = new Logger(PrismaService.name);
    #app?: INestApplication;

    async start(): Promise<void> {
        this.#app = await NestFactory.create(AppModule);

        this.#registerMiddlewares();
        this.#registerGlobals();

        await this.#app.listen(3500);

        this.#prismaLogger.log('✅ Conexión a la base de datos exitosa');
        this.#logger.info(`Servidor corriendo en puerto 3500`, {
            dateShow: false,
        });
}


    #registerMiddlewares(): void {
        this.#app!.use(helmet());
        this.#app!.use(cors());
    }

    #registerGlobals(): void {
        this.#app!.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );
    }
}
