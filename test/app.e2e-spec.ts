import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/infrastructure/filters/exception.filter';

describe('API (e2e)', () => {
    let app: INestApplication<App>;

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

    afterAll(async () => {
        await app.close();
    });
});
