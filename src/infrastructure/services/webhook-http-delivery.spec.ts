import { WebhookHttpDeliveryService } from './webhook-http-delivery.service';

describe('WebhookHttpDeliveryService', () => {
    const delivery = {
        url: 'https://hooks.local/receiver',
        body: '{"event":"SENT"}',
        headers: { 'X-Nexlify-Event': 'SENT' },
    };

    let fetchSpy: jest.SpyInstance;
    beforeAll(() => { fetchSpy = jest.spyOn(global, 'fetch'); });
    afterEach(() => { fetchSpy.mockReset(); });
    afterAll(() => { fetchSpy.mockRestore(); });

    it('posts the exact body and headers with the POST method', async () => {
        const service = new WebhookHttpDeliveryService();
        fetchSpy.mockResolvedValueOnce(new Response(null, { status: 200 }));

        await service.post(delivery);

        expect(fetchSpy).toHaveBeenCalledWith('https://hooks.local/receiver', expect.objectContaining({
            method: 'POST',
            headers: delivery.headers,
            body: delivery.body,
        }));
    });

    it.each([[200, true], [201, true], [301, false], [404, false], [500, false]])(
        'classifies HTTP %i as delivered=%s (only 2xx counts)',
        async (status: number, expectedOk: boolean) => {
            const service = new WebhookHttpDeliveryService();
            fetchSpy.mockResolvedValueOnce(new Response(null, { status }));

            const result = await service.post(delivery);

            expect(result.ok).toBe(expectedOk);
            expect(result.status_code).toBe(status);
            expect(result.error === null).toBe(expectedOk);
        },
    );

    it('reports network failures and timeouts without a status code', async () => {
        const service = new WebhookHttpDeliveryService();
        fetchSpy.mockRejectedValueOnce(new Error('socket hang up'));

        const result = await service.post(delivery);

        expect(result.ok).toBe(false);
        expect(result.status_code).toBeNull();
        expect(result.error).toEqual(expect.stringContaining('socket hang up'));
    });
});
