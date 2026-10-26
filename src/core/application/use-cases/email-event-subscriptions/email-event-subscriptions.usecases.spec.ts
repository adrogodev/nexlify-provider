import 'reflect-metadata';
import { CreateSubscriptionUseCase } from './create-subscription/create-subscription.usecase';
import { GetMySubscriptionsUseCase } from './get-my-subscriptions/get-my-subscriptions.usecase';
import { UpdateSubscriptionUseCase } from './update-subscription/update-subscription.usecase';
import { ActionNotAllowedException, NotFoundException, ValidationException } from 'src/core/domain/exceptions';

describe('EmailEventSubscriptions use cases', () => {
    const endpoint = {
        id_endpoint: 900n,
        endpoint_uuid: '33333333-3333-4333-8333-333333333333',
        id_client: 70n,
        url: 'https://hooks.client.local/receiver',
        secret: 'a'.repeat(64),
        is_active: true,
        created_at: new Date(),
        updated_at: null,
    };
    const foreignEndpoint = { ...endpoint, id_endpoint: 901n, endpoint_uuid: '88888888-8888-4888-8888-888888888888', id_client: 999n };
    const subscription = {
        id_subscription: 5n,
        subscription_uuid: '44444444-4444-4444-8444-444444444444',
        id_client: 70n,
        id_webhook_endpoint: 900n,
        events: 'RECEIVED_REPLY',
        include_body: false,
        include_dates: true,
        include_sender: true,
        include_recipients: true,
        include_attachments: false,
        is_active: true,
        created_at: new Date(),
        updated_at: null,
    };

    const context = (over: { id_user?: number; is_admin?: boolean | null } = {}) => ({
        get: jest.fn(() => ({
            id_user: over.id_user ?? 70,
            is_admin: over.is_admin !== undefined ? over.is_admin : false,
        })),
    });

    const build = () => {
        const context70 = context();
        const adminContext = context({ id_user: 1, is_admin: true });
        const endpointsRepo = {
            findByUuid: jest.fn(async (uuid: string) =>
                uuid === endpoint.endpoint_uuid ? endpoint : uuid === foreignEndpoint.endpoint_uuid ? foreignEndpoint : null),
        };
        const subscriptionsRepo = {
            findByUuid: jest.fn(async (uuid: string) => (uuid === subscription.subscription_uuid ? subscription : null)),
            create: jest.fn(async (data: Record<string, unknown>) => ({ ...subscription, ...data })),
            update: jest.fn(async (_id: bigint, data: Record<string, unknown>) => ({ ...subscription, ...data })),
            getAllAsync: jest.fn(async () => [subscription, { ...subscription, id_subscription: 6n, id_client: 999n }]),
            findAllByClientId: jest.fn(async (id: bigint) => (id === 70n ? [subscription] : [])),
        };
        return {
            context70,
            adminContext,
            endpointsRepo,
            subscriptionsRepo,
            create: new CreateSubscriptionUseCase(context70 as never, endpointsRepo as never, subscriptionsRepo as never),
            createAsAdmin: new CreateSubscriptionUseCase(adminContext as never, endpointsRepo as never, subscriptionsRepo as never),
            mine: new GetMySubscriptionsUseCase(context70 as never, subscriptionsRepo as never),
            mineAsAdmin: new GetMySubscriptionsUseCase(adminContext as never, subscriptionsRepo as never),
        };
    };

    const input = (over: Record<string, unknown> = {}) => ({
        webhook_endpoint_uuid: endpoint.endpoint_uuid,
        events: ['RECEIVED_REPLY'],
        ...over,
    });

    describe('CreateSubscriptionUseCase', () => {
        it('creates the subscription bound to an OWN active endpoint with S1 field defaults', async () => {
            const { create, subscriptionsRepo } = build();

            const result = await create.run({ data: input({ include_body: true }) });

            expect(result.subscription_uuid).toBe('44444444-4444-4444-8444-444444444444');
            expect(result.events).toEqual(['RECEIVED_REPLY']);
            expect(result.is_active).toBe(true);
            const created = subscriptionsRepo.create.mock.calls[0][0] as Record<string, unknown>;
            expect(created['id_client']).toBe(70n);
            expect(created['id_webhook_endpoint']).toBe(900n);
            expect(created['events']).toBe('RECEIVED_REPLY');
            expect(created['include_body']).toBe(true);
            expect(created['include_dates']).toBe(true);
            expect(created['include_sender']).toBe(true);
            expect(created['include_recipients']).toBe(true);
            expect(created['include_attachments']).toBe(false);
            expect(created['is_active']).toBe(true);
            expect(created['subscription_uuid']).toBeUndefined();
            expect(created['id_subscription']).toBeUndefined();
        });

        it('rejects a subscription on an endpoint owned by another client', async () => {
            const { create } = build();

            await expect(create.run({ data: input({ webhook_endpoint_uuid: foreignEndpoint.endpoint_uuid }) }))
                .rejects.toBeInstanceOf(ActionNotAllowedException);
        });

        it('rejects a subscription on an inactive endpoint', async () => {
            const { create, endpointsRepo } = build();
            (endpointsRepo.findByUuid as jest.Mock).mockImplementation(async (uuid: string) =>
                uuid === foreignEndpoint.endpoint_uuid ? { ...foreignEndpoint, is_active: false } : null);

            await expect(create.run({ data: input({ webhook_endpoint_uuid: foreignEndpoint.endpoint_uuid }) }))
                .rejects.toBeInstanceOf(ActionNotAllowedException);
        });

        it('rejects an unknown endpoint uuid with NotFound', async () => {
            const { create } = build();

            await expect(create.run({ data: input({ webhook_endpoint_uuid: '55555555-5555-4555-8555-555555555555' }) }))
                .rejects.toBeInstanceOf(NotFoundException);
        });

        it('rejects an event value outside EmailEventEnum', async () => {
            const { create } = build();

            await expect(create.run({ data: input({ events: ['BOUNCE'] }) }))
                .rejects.toBeInstanceOf(ValidationException);
        });

        it('admin override: may subscribe any client endpoint using the requested id_client', async () => {
            const { createAsAdmin, subscriptionsRepo } = build();

            const result = await createAsAdmin.run({ data: input({ webhook_endpoint_uuid: foreignEndpoint.endpoint_uuid, id_client: 42 }) });

            expect(result.id_client).toBe(42);
            const created = subscriptionsRepo.create.mock.calls[0][0] as Record<string, unknown>;
            expect(created['id_client']).toBe(42n);
            expect(created['id_webhook_endpoint']).toBe(901n);
        });
    });

    describe('GetMySubscriptionsUseCase', () => {
        it('lists only the own subscriptions for a non-admin client', async () => {
            const { mine, subscriptionsRepo } = build();

            const result = await mine.run({ data: null });

            expect(result).toHaveLength(1);
            expect(result[0].subscription_uuid).toBe(subscription.subscription_uuid);
            expect(result[0].events).toEqual(['RECEIVED_REPLY']);
            expect(subscriptionsRepo.findAllByClientId).toHaveBeenCalledWith(70n);
            expect(subscriptionsRepo.getAllAsync).not.toHaveBeenCalled();
        });

        it('admin without filter sees every subscription and with filter one client only', async () => {
            const { mineAsAdmin, subscriptionsRepo } = build();

            const all = await mineAsAdmin.run({ data: null });
            expect(all).toHaveLength(2);
            expect(subscriptionsRepo.getAllAsync).toHaveBeenCalledTimes(1);

            const filtered = await mineAsAdmin.run({ data: { id_client: 70 } });
            expect(filtered).toHaveLength(1);
            expect(subscriptionsRepo.findAllByClientId).toHaveBeenCalledWith(70n);
        });
    });

    describe('UpdateSubscriptionUseCase', () => {
        it('updates events, field flags and is_active for the owner', async () => {
            const context70 = build();
            const update = new UpdateSubscriptionUseCase(context70.context70 as never, context70.subscriptionsRepo as never);

            const result = await update.run({
                data: {
                    subscription_uuid: subscription.subscription_uuid,
                    events: ['RECEIVED_REPLY', 'RECEIVED_REPLY'],
                    include_attachments: true,
                    is_active: false,
                },
            });

            expect(result.is_active).toBe(false);
            expect(result.events).toEqual(['RECEIVED_REPLY']);
            const patch = context70.subscriptionsRepo.update.mock.calls[0][1] as Record<string, unknown>;
            expect(patch['events']).toBe('RECEIVED_REPLY');
            expect(patch['include_attachments']).toBe(true);
            expect(patch['is_active']).toBe(false);
            expect(Object.keys(patch)).not.toContain('subscription_uuid');
            expect(Object.keys(patch)).not.toContain('id_client');
        });

        it('rejects the update of another client subscription without admin', async () => {
            const foreign = context({ id_user: 51 });
            const built = build();
            const update = new UpdateSubscriptionUseCase(foreign as never, built.subscriptionsRepo as never);

            await expect(update.run({ data: { subscription_uuid: subscription.subscription_uuid, is_active: true } }))
                .rejects.toBeInstanceOf(ActionNotAllowedException);
        });

        it('rejects an update with an event outside EmailEventEnum', async () => {
            const built = build();
            const update = new UpdateSubscriptionUseCase(built.context70 as never, built.subscriptionsRepo as never);

            await expect(update.run({ data: { subscription_uuid: subscription.subscription_uuid, events: ['BOUNCE'] } }))
                .rejects.toBeInstanceOf(ValidationException);
        });

        it('throws NotFound for an unknown subscription uuid', async () => {
            const built = build();
            const update = new UpdateSubscriptionUseCase(built.context70 as never, built.subscriptionsRepo as never);

            await expect(update.run({ data: { subscription_uuid: '66666666-6666-4666-8666-666666666666', is_active: true } }))
                .rejects.toBeInstanceOf(NotFoundException);
        });

        it('admin may update any client subscription', async () => {
            const built = build();
            const update = new UpdateSubscriptionUseCase(built.adminContext as never, built.subscriptionsRepo as never);

            const result = await update.run({ data: { subscription_uuid: subscription.subscription_uuid, is_active: false } });

            expect(result.is_active).toBe(false);
        });
    });
});
