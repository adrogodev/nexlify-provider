import { createHmac } from 'node:crypto';
import {
    ActionNotAllowedException,
    NotFoundException,
} from 'src/core/domain/exceptions';
import { WebhookSignerHelper } from 'src/infrastructure/helpers/webhook-signer.helper';
import {
    ListWebhookDeliveriesUseCase,
    RedeliverWebhookDeliveryUseCase,
    TestWebhookEndpointUseCase,
} from './webhook-deliveries.usecases';

const endpoint = (overrides: Record<string, unknown> = {}) => ({
    id_endpoint: 3n,
    endpoint_uuid: '00000000-0000-4000-8000-000000000003',
    id_client: 70n,
    url: 'https://hooks.local/receiver',
    secret: 'endpoint-secret',
    is_active: true,
    created_at: null,
    updated_at: null,
    ...overrides,
});

const delivery = (overrides: Record<string, unknown> = {}) => ({
    id_delivery: 44n,
    id_endpoint: 3n,
    id_email: 9n,
    event: 'SENT',
    payload: null,
    attempt: 3,
    ok: false,
    status_code: 500,
    error: 'HTTP 500',
    next_retry_at: null,
    created_at: new Date('2026-11-01T00:00:00Z'),
    updated_at: null,
    ...overrides,
});

const contextFor = (idUser = 70, isAdmin = false) => ({
    get: () => ({ id_user: idUser, is_admin: isAdmin }),
});

describe('ListWebhookDeliveriesUseCase', () => {
    const build = (
        opts: {
            endpointRow?: unknown;
            idUser?: number;
            isAdmin?: boolean;
        } = {},
    ) => {
        const endpointsRepo = {
            findByUuid: jest.fn(async () =>
                opts.endpointRow === undefined ? endpoint() : opts.endpointRow,
            ),
        };
        const deliveriesRepo = {
            countByEndpoint: jest.fn(async () => 41),
            findPageByEndpoint: jest.fn(async () => [
                { ...delivery(), short_code: 'NX-AAAAAA1' },
            ]),
        };
        const useCase = new ListWebhookDeliveriesUseCase(
            contextFor(opts.idUser, opts.isAdmin) as never,
            endpointsRepo as never,
            deliveriesRepo as never,
        );
        return { useCase, deliveriesRepo };
    };

    it('returns the paginated history of an own endpoint in the GET api/email envelope', async () => {
        const { useCase, deliveriesRepo } = build();

        const result = await useCase.run({
            data: {
                endpoint_uuid: endpoint().endpoint_uuid,
                page: 3,
                limit: 20,
            },
        });

        expect(deliveriesRepo.findPageByEndpoint).toHaveBeenCalledWith(
            3n,
            3,
            20,
        );
        expect(result).toEqual({
            total_items: 41,
            page: 3,
            data: [
                {
                    id_delivery: '44',
                    event: 'SENT',
                    attempt: 3,
                    ok: false,
                    status_code: 500,
                    error: 'HTTP 500',
                    next_retry_at: null,
                    created_at: new Date('2026-11-01T00:00:00Z'),
                    short_code: 'NX-AAAAAA1',
                },
            ],
        });
    });

    it('defaults to page 1 / 20 items', async () => {
        const { useCase, deliveriesRepo } = build();

        await useCase.run({
            data: { endpoint_uuid: endpoint().endpoint_uuid },
        });

        expect(deliveriesRepo.findPageByEndpoint).toHaveBeenCalledWith(
            3n,
            1,
            20,
        );
    });

    it('forbids another client endpoint and 404s an unknown one', async () => {
        await expect(
            build({ idUser: 71 }).useCase.run({ data: { endpoint_uuid: 'x' } }),
        ).rejects.toBeInstanceOf(ActionNotAllowedException);
        await expect(
            build({ endpointRow: null }).useCase.run({
                data: { endpoint_uuid: 'x' },
            }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets an admin read any endpoint', async () => {
        await expect(
            build({ idUser: 1, isAdmin: true }).useCase.run({
                data: { endpoint_uuid: 'x' },
            }),
        ).resolves.toMatchObject({ total_items: 41 });
    });
});

describe('RedeliverWebhookDeliveryUseCase', () => {
    const build = (
        opts: {
            deliveryRow?: unknown;
            endpointRow?: unknown;
            idUser?: number;
        } = {},
    ) => {
        const endpointsRepo = {
            getByIdAsync: jest.fn(async () =>
                opts.endpointRow === undefined ? endpoint() : opts.endpointRow,
            ),
        };
        const deliveriesRepo = {
            getByIdAsync: jest.fn(async () =>
                opts.deliveryRow === undefined ? delivery() : opts.deliveryRow,
            ),
            update: jest.fn(async () => null),
        };
        const useCase = new RedeliverWebhookDeliveryUseCase(
            contextFor(opts.idUser) as never,
            endpointsRepo as never,
            deliveriesRepo as never,
        );
        return { useCase, deliveriesRepo };
    };

    it('resets the same row so the scheduler ships it again now', async () => {
        const { useCase, deliveriesRepo } = build();
        const before = Date.now();

        await expect(useCase.run({ data: '44' })).resolves.toEqual({
            queued: true,
        });

        expect(deliveriesRepo.getByIdAsync).toHaveBeenCalledWith(44n);
        const [id, patch] = deliveriesRepo.update.mock.calls[0] as unknown as [
            bigint,
            Record<string, unknown>,
        ];
        expect(id).toBe(44n);
        expect(patch).toMatchObject({
            attempt: 0,
            ok: null,
            status_code: null,
            error: null,
        });
        expect((patch.next_retry_at as Date).getTime()).toBeGreaterThanOrEqual(
            before,
        );
    });

    it('404s an unknown delivery and forbids other clients', async () => {
        await expect(
            build({ deliveryRow: null }).useCase.run({ data: '44' }),
        ).rejects.toBeInstanceOf(NotFoundException);
        await expect(
            build({ idUser: 71 }).useCase.run({ data: '44' }),
        ).rejects.toBeInstanceOf(ActionNotAllowedException);
    });

    it('refuses to redeliver to an inactive endpoint', async () => {
        const { useCase, deliveriesRepo } = build({
            endpointRow: endpoint({ is_active: false }),
        });

        await expect(useCase.run({ data: '44' })).rejects.toBeInstanceOf(
            ActionNotAllowedException,
        );
        expect(deliveriesRepo.update).not.toHaveBeenCalled();
    });
});

describe('TestWebhookEndpointUseCase', () => {
    const build = (result: unknown, idUser = 70) => {
        const endpointsRepo = { findByUuid: jest.fn(async () => endpoint()) };
        const http = { post: jest.fn(async () => result) };
        let clock = 1_700_000_000_000;
        const now = jest.fn(() => {
            const value = clock;
            clock += 125;
            return value;
        });
        const useCase = new TestWebhookEndpointUseCase(
            contextFor(idUser) as never,
            endpointsRepo as never,
            http,
            new WebhookSignerHelper(),
            now,
        );
        return { useCase, http };
    };

    it('posts a signed ping synchronously and reports the outcome with its duration', async () => {
        const { useCase, http } = build({
            ok: true,
            status_code: 204,
            error: null,
        });

        const result = await useCase.run({ data: endpoint().endpoint_uuid });

        const request = http.post.mock.calls[0][0] as {
            url: string;
            body: string;
            headers: Record<string, string>;
        };
        expect(request.url).toBe('https://hooks.local/receiver');
        expect(JSON.parse(request.body)).toMatchObject({
            event: 'ping',
            endpoint_uuid: endpoint().endpoint_uuid,
        });
        expect(request.headers['X-Nexlify-Event']).toBe('ping');
        expect(request.headers['X-Nexlify-Signature']).toBe(
            createHmac('sha256', 'endpoint-secret')
                .update(request.body)
                .digest('hex'),
        );
        expect(result).toEqual({
            ok: true,
            status_code: 204,
            error: null,
            duration_ms: 125,
        });
    });

    it('reports a failing receiver without throwing', async () => {
        const { useCase } = build({
            ok: false,
            status_code: null,
            error: 'Fallo la entrega del webhook: timeout',
        });

        await expect(
            useCase.run({ data: endpoint().endpoint_uuid }),
        ).resolves.toMatchObject({ ok: false, status_code: null });
    });

    it('forbids testing another client endpoint', async () => {
        await expect(
            build({ ok: true }, 71).useCase.run({
                data: endpoint().endpoint_uuid,
            }),
        ).rejects.toBeInstanceOf(ActionNotAllowedException);
    });
});
