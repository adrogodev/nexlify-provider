import { colors } from '@gamastudio/colorslog';
import { type INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { apiReference } from '@scalar/nestjs-api-reference';
import { NestFactory } from '@nestjs/core';
import cors from 'cors';
import { randomBytes } from 'node:crypto';
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
    // Boot-time nonce for the /api/docs page: helmet CSP allows scripts ONLY
    // with this nonce and the Scalar middleware stamps it on its script tags.
    readonly #docsNonce = randomBytes(16).toString('base64');
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
        // Scalar's reference UI is self-hosted now: the UMD standalone bundle is
        // served from our own origin ('/scalar-runtime/standalone.js'), so the
        // CSP stays default ('self') plus a blob worker for the search — no CDN.
        // helmet defaults would otherwise block the old CDN import; the UMD build
        // (window.Scalar.createApiReference) needs no module imports.
        this.#app!.use(
            helmet({
                contentSecurityPolicy: {
                    directives: {
                        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                        'script-src': ["'self'", `'nonce-${this.#docsNonce}'`],
                        // The UMD bundle injects its stylesheet at runtime; the
                        // scalar-nonce covers the strict case, unsafe-inline is
                        // the pragmatic fallback for non-strict builds.
                        'style-src': ["'self'", `'nonce-${this.#docsNonce}'`, "'unsafe-inline'", 'https:'],
                        'worker-src': ["'self'", 'blob:'],
                    },
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

    // Pure-Scalar documentation, FULLY self-hosted: the OpenAPI contract is a
    // versioned JSON file owned by the repo (docs/openapi.json) and the Scalar
    // runtime is the UMD standalone build shipped in our node_modules, served
    // from our own origin — the browser never touches a CDN.
    // /api/docs renders the interactive reference; /api/docs-json exposes the
    // same document for Postman/Scalar Cloud imports.
    #registerDocs(): void {
        const specPath = path.join(process.cwd(), 'docs', 'openapi.json');
        let spec: Record<string, unknown>;
        try {
            spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
        } catch (error) {
            colors.error(`No se pudo cargar docs/openapi.json — documentacion deshabilitada: ${error}`, { dateShow: false });
            return;
        }

        const runtimePath = path.join(process.cwd(), 'node_modules', '@scalar', 'api-reference', 'dist', 'browser', 'standalone.js');
        if (!fs.existsSync(runtimePath)) {
            colors.error('No se encontro el bundle Standalone de Scalar (@scalar/api-reference) — UI deshabilitada', { dateShow: false });
            return;
        }

        // Single self-hosted file: <script src> + window.Scalar global (UMD).
        this.#app!.use('/scalar-runtime', (req: unknown, res: { sendFile(absolutePath: string, cb?: (err?: unknown) => void): void }, next: () => void) => {
            const raw = (req as { method?: string; path?: string }).path ?? '';
            if ((req as { method?: string }).method !== 'GET' && (req as { method?: string }).method !== 'HEAD') {
                next();
                return;
            }
            if (raw === '/standalone.js') {
                res.sendFile(runtimePath);
                return;
            }
            next();
        });

        this.#app!.use('/api/docs-json', (_req: unknown, res: { json(payload: unknown): void }) => {
            res.json(spec);
        });

        this.#app!.use(
            '/api/docs',
            // No-store: browsers must never keep an old docs shell around.
            (req: unknown, res: { setHeader(key: string, value: string): void }, next: () => void) => {
                res.setHeader('Cache-Control', 'no-store');
                next();
            },
            apiReference({
                // A custom cdn makes the middleware emit the UMD bundle path
                // (<script src=...> + window.Scalar global) instead of the CDN
                // module import — here it points at our own origin. The nonce
                // goes into the CSP above AND gets stamped on the script tags
                // (plus <meta csp-nonce> for runtime-injected styles).
                cdn: '/scalar-runtime/standalone.js',
                nonce: this.#docsNonce,
                content: spec,
                theme: 'purple',
                pageTitle: 'nexlify-provider API Reference',
            }),
        );
    }
}
