import { colors } from '@gamastudio/colorslog';
import { type INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cors from 'cors';
import helmet from 'helmet';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { AppEnvs as _env } from '../../infrastructure/environments/app-env.config'

export class Server {
    readonly #logger = colors;
    readonly #prismaLogger = new Logger(PrismaService.name);
    #app?: INestApplication;

    async start(): Promise<void> {
        this.#app = await NestFactory.create(AppModule);

        this.#registerMiddlewares();
        this.#registerGlobals();

        await this.#app.listen(_env.PORT);

        this.#prismaLogger.log('✅ Conexión a la base de datos exitosa');
        this.#logger.info(`Servidor corriendo en puerto ${_env.PORT}`, {
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
