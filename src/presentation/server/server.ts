import { colors } from '@gamastudio/colorslog';
import { type INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { apiReference } from '@scalar/nestjs-api-reference';
import { NestFactory } from '@nestjs/core';
import cors from 'cors';
import * as fs from 'node:fs';
import helmet from 'helmet';
import * as path from 'node:path';
import { AppModule } from 'src/app.module';
import { ValidationException } from 'src/core/domain/exceptions';
import { GlobalExceptionFilter } from 'src/infrastructure/filters/exception.filter';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { AppEnvs as _env } from '../../infrastructure/environments/app-env.config';

export class Server {
    readonly #logger = colors;
    readonly #prismaLogger = new Logger(PrismaService.name);
    #app?: INestApplication;

    async start(): Promise<void> {
        // rawBody keeps the exact request bytes for the inbound webhook HMAC signature
        // (String attaches the parsed body only; the bytes are what gets verified).
        this.#app = await NestFactory.create(AppModule, { rawBody: true });

        this.#registerMiddlewares();
        await this.#registerDocs();
        this.#registerGlobals();

        await this.#app.listen(_env.PORT);

        this.#prismaLogger.log('✅ Conexión a la base de datos exitosa');
        this.#logger.info(`Servidor corriendo en puerto ${_env.PORT}`, {
            dateShow: false,
        });
    }

    #registerMiddlewares(): void {
        // helmet defaults ship CSP script-src:'self', which blocks the Scalar
        // reference UI (its runtime loads from the jsdelivr CDN). The API itself
        // serves no first-party HTML besides /api/docs, so we widen ONLY the
        // directives the Scalar runtime needs (module scripts, web worker blob,
        // CDN connects) instead of disabling CSP for the whole app.
        // helmet@8 default directives are kebab-case: replace those keys first
        // or it throws a duplicate-directive error.
        const scalarCsBp = {
            'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
            'worker-src': ["'self'", 'blob:'],
            'connect-src': ["'self'", 'https://cdn.jsdelivr.net'],
            'style-src': ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'", 'https:'],
            'font-src': ["'self'", 'https://cdn.jsdelivr.net', 'https:', 'data:'],
            'img-src': ["'self'", 'https://cdn.jsdelivr.net', 'data:', 'https:'],
        };
        const overridden = ['script-src', 'worker-src', 'connect-src', 'style-src', 'font-src', 'img-src'];
        const defaults = helmet.contentSecurityPolicy.getDefaultDirectives();
        const base = Object.fromEntries(Object.entries(defaults).filter(([key]) => !overridden.includes(key)));
        this.#app!.use(
            helmet({
                contentSecurityPolicy: {
                    directives: { ...base, ...scalarCsBp },
                },
            }),
        );
        this.#app!.use(cors());
    }

    #registerGlobals(): void {
        this.#app!.useGlobalFilters(new GlobalExceptionFilter());

        this.#app!.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
                exceptionFactory: (errors) => {
                    const formatted = errors.reduce<Record<string, string[]>>(
                        (acc, error) => {
                            acc[error.property] = Object.values(
                                error.constraints ?? {},
                            );
                            return acc;
                        },
                        {},
                    );
                    return new ValidationException(formatted);
                },
            }),
        );
    }

    // Pure-Scalar documentation: the OpenAPI contract is a versioned JSON file
    // owned by the repo (docs/openapi.json) — nothing is generated from
    // decorators. /api/docs renders the interactive reference; /api/docs-json
    // exposes the same document for Postman/Scalar Cloud imports.
    async #registerDocs(): Promise<void> {
        const specPath = path.join(process.cwd(), 'docs', 'openapi.json');
        let spec: Record<string, unknown>;
        try {
            spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
        } catch (error) {
            colors.error(`No se pudo cargar docs/openapi.json — documentacion deshabilitada: ${error}`, { dateShow: false });
            return;
        }

        this.#app!.use('/api/docs-json', (_req: unknown, res: { json(payload: unknown): void }) => {
            res.json(spec);
        });

        this.#app!.use(
            '/api/docs',
            apiReference({
                content: spec,
                theme: 'purple',
                pageTitle: 'nexlify-provider API Reference',
            }),
        );
    }
}
