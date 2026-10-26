import { createHmac } from 'node:crypto';
import { WebhookDeliveryScheduler, WEBHOOK_SCHEDULER_INTERVAL_MS } from './webhook-delivery.scheduler.service';

const endpointRow = {
    id_endpoint: 3n,
    endpoint_uuid: '00000000-0000-4000-8000-000000000003',
    id_client: 70n,
    url: 'https://hooks.local/receiver',
    secret: 'endpoint-secret',
    is_active: true,
    created_at: null,
    updated_at: null,
};

const emailRow = {
    id_email: 9n,
    email_uuid: 'aaaaaaaa-1111-4111-8111-111111111111',
    short_code: 'NX-AAAAAA1',
    id_client: 70n,
    from_email: 'sender@nexlify.local',
    to_email: 'dest@test.local',
    subject: 'Hola',
    body_html: null,
    body_text: null,
    state: 'SENT',
    attempts: 1,
    next_retry_at: null,
    sent_at: new Date('2026-01-01T00:00:00Z'),
    created_at: null,
    updated_at: null,
};

const deliveryRow = (overrides: Record<string, unknown> = {}) => ({
    id_delivery: 44n,
    id_endpoint: 3n,
    id_email: 9n,
    event: 'SENT',
    payload: null,
    attempt: 0,
    ok: null,
    status_code: null,
    error: null,
    next_retry_at: new Date('2026-01-01T00:00:00Z'),
    created_at: null,
    updated_at: null,
    ...overrides,
});

describe('WebhookDeliveryScheduler', () => {
    const expectedPayload = {
        event: 'SENT',
        email_uuid: 'aaaaaaaa-1111-4111-8111-111111111111',
        short_code: 'NX-AAAAAA1',
        attempts: 1,
        subject: 'Hola',
        to_email: 'dest@test.local',
        sent_at: new Date('2026-01-01T00:00:00Z'),
    };

    const build = ({ due = [deliveryRow()], endpoint = endpointRow, email = emailRow, postResult, postImpl }: {
        due?: Array<Record<string, unknown>>;
        endpoint?: unknown;
        email?: unknown;
        postResult?: unknown;
        postImpl?: () => Promise<unknown>;
    } = {}) => {
        const findDue = jest.fn(async () => due);
        const deliveriesUpdate = jest.fn(async () => null);
        const getEndpoint = jest.fn(async () => endpoint);
        const getEmail = jest.fn(async () => email);
        const post = postImpl
            ? jest.fn(postImpl)
            : jest.fn(async () => postResult ?? { ok: true, status_code: 200, error: null });
        const scheduler = new WebhookDeliveryScheduler(
            { findDue, update: deliveriesUpdate } as never,
            { getByIdAsync: getEndpoint } as never,
            { getByIdAsync: getEmail } as never,
            { post } as never,
        );
        return { scheduler, findDue, deliveriesUpdate, getEndpoint, getEmail, post };
    };

    it('posts the exact signed payload and records the delivery on 2xx', async () => {
        const { scheduler, deliveriesUpdate, post } = build({});
        const expectedBody = JSON.stringify(expectedPayload);

        await scheduler.tick();

        expect(post).toHaveBeenCalledTimes(1);
        const request = post.mock.calls[0][0];
        expect(request.url).toBe('https://hooks.local/receiver');
        expect(request.body).toBe(expectedBody);
        expect(request.headers).toEqual({
            'Content-Type': 'application/json',
            'X-Nexlify-Event': 'SENT',
            'X-Nexlify-Delivery': '44',
            'X-Nexlify-Signature': createHmac('sha256', 'endpoint-secret').update(expectedBody).digest('hex'),
        });
        expect(deliveriesUpdate).toHaveBeenCalledWith(44n, expect.objectContaining({
            attempt: 1,
            ok: true,
            status_code: 200,
            error: null,
            next_retry_at: null,
        }));
    });

    it('keeps the delivery-status generic payload byte-exact when the row carries no stored payload', async () => {
        const { scheduler, post } = build({ due: [deliveryRow({ payload: null })] });

        await scheduler.tick();

        const request = post.mock.calls[0][0];
        expect(request.body).toBe(JSON.stringify(expectedPayload));
        expect(JSON.parse(request.body)).toEqual({ ...expectedPayload, sent_at: new Date('2026-01-01T00:00:00Z').toISOString() });
    });

    it('posts a stored payload verbatim and signs over it', async () => {
        const stored = JSON.stringify({
            event: 'RECEIVED_REPLY',
            email_uuid: 'bbbbbbbb-2222-4111-8111-222222222222',
            parent: { email_uuid: 'aaaaaaaa-1111-4111-8111-111111111111', short_code: 'NX-PARENT1' },
            received_at: '2026-10-26T10:00:00.000Z',
            body: { text: 'cuerpo', html: null },
        });
        const { scheduler, post } = build({
            due: [deliveryRow({ event: 'RECEIVED_REPLY', payload: stored })],
            email: { ...emailRow, id_email: 9n, email_uuid: 'bbbbbbbb-2222-4111-8111-222222222222' },
        });

        await scheduler.tick();

        const request = post.mock.calls[0][0];
        expect(request.body).toBe(stored);
        expect(request.headers).toEqual({
            'Content-Type': 'application/json',
            'X-Nexlify-Event': 'RECEIVED_REPLY',
            'X-Nexlify-Delivery': '44',
            'X-Nexlify-Signature': createHmac('sha256', 'endpoint-secret').update(stored).digest('hex'),
        });
    });

    it('schedules a 60s retry per failed attempt', async () => {
        const postResult = { ok: false, status_code: 500, error: 'HTTP 500' };
        const { scheduler, deliveriesUpdate } = build({ postResult });
        const before = Date.now();

        await scheduler.tick();

        const patch = deliveriesUpdate.mock.calls[0][1];
        expect(patch.attempt).toBe(1);
        expect(patch.ok).toBeNull();
        expect(patch.status_code).toBe(500);
        expect(patch.next_retry_at.getTime()).toBeGreaterThanOrEqual(before + 59_999);
        expect(patch.next_retry_at.getTime()).toBeLessThanOrEqual(before + 60_000 + 1_000);
    });

    it('gives up with ok=false after the third failed attempt', async () => {
        const postResult = { ok: false, status_code: 503, error: 'HTTP 503' };
        const { scheduler, deliveriesUpdate } = build({ due: [deliveryRow({ attempt: 2 })], postResult });

        await scheduler.tick();

        expect(deliveriesUpdate).toHaveBeenCalledWith(44n, expect.objectContaining({
            attempt: 3,
            ok: false,
            status_code: 503,
            error: 'HTTP 503',
            next_retry_at: null,
        }));
    });

    it('gives up when the endpoint row no longer exists', async () => {
        const { scheduler, deliveriesUpdate, post } = build({ endpoint: null });

        await scheduler.tick();

        expect(post).not.toHaveBeenCalled();
        expect(deliveriesUpdate).toHaveBeenCalledWith(44n, expect.objectContaining({
            ok: false,
            next_retry_at: null,
        }));
    });

    it('gives up when the endpoint is inactive', async () => {
        const { scheduler, deliveriesUpdate, post } = build({ endpoint: { ...endpointRow, is_active: false } });

        await scheduler.tick();

        expect(post).not.toHaveBeenCalled();
        expect(deliveriesUpdate).toHaveBeenCalledWith(44n, expect.objectContaining({
            ok: false,
            next_retry_at: null,
        }));
    });

    it('keeps the batch alive when one delivery explodes', async () => {
        const { scheduler, deliveriesUpdate, post } = build({
            due: [deliveryRow(), deliveryRow({ id_delivery: 45n })],
            postImpl: jest.fn()
                .mockRejectedValueOnce(new Error('boom'))
                .mockResolvedValue({ ok: true, status_code: 200, error: null }),
        });

        await scheduler.tick();

        expect(post).toHaveBeenCalledTimes(2);
        expect(deliveriesUpdate).toHaveBeenCalledTimes(1);
        expect(deliveriesUpdate).toHaveBeenCalledWith(45n, expect.objectContaining({ ok: true }));
    });

    it('processes due deliveries on every tick', async () => {
        const { scheduler, findDue } = build({});

        await scheduler.tick();

        expect(findDue).toHaveBeenCalled();
    });

    it('survives a failing batch without throwing', async () => {
        const findDue = jest.fn(async () => { throw new Error('boom'); });
        const scheduler = new WebhookDeliveryScheduler(
            { findDue, update: jest.fn() } as never,
            { getByIdAsync: jest.fn() } as never,
            { getByIdAsync: jest.fn() } as never,
            { post: jest.fn() } as never,
        );

        await expect(scheduler.tick()).resolves.toBeUndefined();
    });

    it('starts and stops the interval on module lifecycle', () => {
        const { scheduler, findDue } = build({});
        jest.useFakeTimers();

        scheduler.onModuleInit();
        expect(scheduler.isRunning()).toBe(true);
        expect(WEBHOOK_SCHEDULER_INTERVAL_MS).toBe(30_000);
        jest.advanceTimersByTime(31_000);
        expect(findDue).toHaveBeenCalled();
        scheduler.onModuleDestroy();
        expect(scheduler.isRunning()).toBe(false);

        jest.useRealTimers();
    });
});
