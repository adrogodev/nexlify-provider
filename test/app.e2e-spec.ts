import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/infrastructure/filters/exception.filter';
import { AppEnvs } from '../src/infrastructure/environments/app-env.config';
import { UnsubscribeTokenService } from '../src/infrastructure/services/unsubscribe-token.service';

describe('API (e2e)', () => {
    let app: INestApplication<App>;
    const suppressions = {
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id_suppression: 1n, suppression_uuid: 'u', ...data })),
    };

    const emails = {
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            // The e2e suite does not require a live database: every repository-backed
            // scenario is covered by unit specs with mocked repositories.
            .overrideProvider(PrismaService)
            .useValue({
                $connect: jest.fn(),
                $disconnect: jest.fn(),
                $on: jest.fn(),
                $extends: jest.fn(),
                admin_user: {},
                emails,
                nexlify_keys: { findFirst: jest.fn(async () => ({ id_nexlify_key: 1n, id_client: 7n, state: true })) },
                email_send_logs: {},
                email_attachments: {},
                email_event_subscriptions: {},
                id_types: { findMany: jest.fn(async () => []) },
                webhook_endpoints: {},
                webhook_deliveries: {},
                sending_domains: {},
                email_certificates: { findUnique: jest.fn(async () => null) },
                suppressions,
            })
            .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalFilters(new GlobalExceptionFilter());
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();
    });

    it('GET /api/verify responds successfully', () => {
        return request(app.getHttpServer())
            .get('/api/verify')
            .expect(200);
    });

    it('GET /api/master/id-types rejects unauthenticated requests (AuthGuard)', () => {
        return request(app.getHttpServer())
            .get('/api/master/id-types')
            .expect(403);
    });

    it('POST /api/email/send rejects unauthenticated requests (AuthGuard + ConfigurationExistsGuard)', () => {
        return request(app.getHttpServer())
            .post('/api/email/send')
            .send({ from: 'a@b.com', to: 'c@d.com', subject: 's', text: 't' })
            .expect(403);
    });

    it('GET /api/email rejects unauthenticated requests (AuthGuard)', () => {
        return request(app.getHttpServer())
            .get('/api/email')
            .expect(403);
    });

    it('POST /api/email/:emailId/retry rejects unauthenticated requests (AuthGuard)', () => {
        return request(app.getHttpServer())
            .post('/api/email/NX-AAAAAA1/retry')
            .expect(403);
    });

    it('POST /api/webhooks rejects unauthenticated requests (EmailAuthGuard)', () => {
        return request(app.getHttpServer())
            .post('/api/webhooks')
            .send({ url: 'https://hooks.local/receiver' })
            .expect(403);
    });

    it('GET /api/webhooks/my rejects unauthenticated requests (EmailAuthGuard)', () => {
        return request(app.getHttpServer())
            .get('/api/webhooks/my')
            .expect(403);
    });

    it('PUT /api/webhooks/:endpointUuid rejects unauthenticated requests (EmailAuthGuard)', () => {
        return request(app.getHttpServer())
            .put('/api/webhooks/11111111-1111-4111-8111-111111111111')
            .send({ url: 'https://hooks.local/receiver' })
            .expect(403);
    });

    it('GET /api/domains rejects unauthenticated requests (AuthGuard)', () => {
        return request(app.getHttpServer()).get('/api/domains').expect(403);
    });

    it('GET /api/suppressions rejects unauthenticated requests (AuthGuard)', () => {
        return request(app.getHttpServer()).get('/api/suppressions').expect(403);
    });

    it('POST /api/email/events/bounce rejects a missing HMAC signature', () => {
        return request(app.getHttpServer())
            .post('/api/email/events/bounce')
            .send({ recipient: 'a@test.local', type: 'HARD_BOUNCE' })
            .expect(401);
    });

    it('GET /api/unsubscribe/:token renders an invalid-link page for a forged token (public, no auth)', async () => {
        const response = await request(app.getHttpServer()).get('/api/unsubscribe/forged.token').expect(400);
        expect(response.headers['content-type']).toContain('text/html');
        expect(response.text).toContain('Enlace invalido');
    });

    it('GET + POST /api/unsubscribe/:token confirm page and one-click suppression', async () => {
        const token = new UnsubscribeTokenService(AppEnvs.ENCRYPT_KEY, AppEnvs.PUBLIC_API_URL).sign({ email: 'dest@test.local', id_client: 7n });

        const page = await request(app.getHttpServer()).get(`/api/unsubscribe/${token}`).expect(200);
        expect(page.text).toContain('dest@test.local');
        expect(page.text).toContain('<form method="post">');
        expect(page.headers['content-security-policy']).toContain("form-action 'self'");
        expect(suppressions.create).not.toHaveBeenCalled();

        const done = await request(app.getHttpServer())
            .post(`/api/unsubscribe/${token}`)
            .type('form')
            .send('List-Unsubscribe=One-Click')
            .expect(200);
        expect(done.text).toContain('Suscripcion cancelada');
        expect(suppressions.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ id_client: 7n, email: 'dest@test.local', reason: 'UNSUBSCRIBE' }),
        });
    });

    it.each([
        ['get', '/api/stats/overview'],
        ['get', '/api/ai/status'],
        ['post', '/api/email/NX-AAAAAA1/certificate'],
        ['get', '/api/email/NX-AAAAAA1/certificate'],
        ['get', '/api/email/NX-AAAAAA1/certificate/pdf'],
        ['post', '/api/email/NX-AAAAAA1/analyze'],
        ['get', '/api/webhooks/11111111-1111-4111-8111-111111111111/deliveries'],
        ['post', '/api/webhooks/deliveries/44/redeliver'],
        ['post', '/api/webhooks/11111111-1111-4111-8111-111111111111/test'],
    ])('%s %s rejects unauthenticated requests (EmailAuthGuard)', (method, path) => {
        return (request(app.getHttpServer()) as unknown as Record<string, (url: string) => request.Test>)[method](path).expect(403);
    });

    it('GET /api/certificates/:code/verify is public and 404s an unknown certificate', async () => {
        const response = await request(app.getHttpServer()).get('/api/certificates/NXC-UNKNOWN000/verify').expect(404);
        expect(response.body).toMatchObject({ ok: false, message: 'Certificado no encontrado' });
    });

    it('GET /api/certificates/:code/verify rejects a malformed code with 400', () => {
        return request(app.getHttpServer()).get('/api/certificates/not-a-code/verify').expect(400);
    });

    it('GET /api/email with a valid X-API-Key lists only the calling client emails (request context available)', async () => {
        emails.findMany.mockClear();
        emails.count.mockClear();

        await request(app.getHttpServer())
            .get('/api/email?id_client=8')
            .set('X-API-Key', 'e2e-client-key')
            .expect(200);

        expect(emails.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id_client: 7n }) }));
        expect(emails.count).toHaveBeenCalledWith({ where: expect.objectContaining({ id_client: 7n }) });
    });

    it('POST /api/client/forgot-password answers 429 after 5 attempts per minute from the same IP', async () => {
        const statuses: number[] = [];
        for (let i = 0; i < 6; i++) {
            const res = await request(app.getHttpServer()).post('/api/client/forgot-password').send({});
            statuses.push(res.status);
        }

        expect(statuses.slice(0, 5)).not.toContain(429);
        expect(statuses[5]).toBe(429);
    });

    afterAll(async () => {
        await app.close();
    });
});
