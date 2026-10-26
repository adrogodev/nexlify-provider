import { RetryDueEmailsUseCase } from './retry-due-emails.usecase';
import { Email } from 'src/core/domain/entities/email.entity';
import { EmailStateEnum } from 'src/core/domain/enum';

describe('RetryDueEmailsUseCase (budget-aware tick)', () => {
    const email = {
        id_email: 100n,
        email_uuid: '11111111-2222-4333-8444-555555555555',
        short_code: 'NX-AAAAAA1',
        id_client: null,
        from_email: 'a@test.local',
        to_email: 'b@test.local',
        subject: 'Hola',
        body_html: null,
        body_text: 'texto',
        state: EmailStateEnum.QUEUED,
        attempts: 0,
        next_retry_at: null,
        sent_at: null,
        created_at: new Date(),
        updated_at: null,
    } as unknown as Email;

    const config = {
        id_configuration: 1n,
        sender_email: 'sender@nexlify.local',
        id_smtp_server: 5n,
        daily_send_limit: 500 as number | null,
    };

    const build = (overrides?: {
        queued?: Email[];
        retryable?: Email[];
        config?: unknown;
        sentToday?: number;
        failingIds?: string[];
    }) => {
        const cfg = overrides?.config !== undefined ? overrides.config : config;
        const queued = overrides?.queued ?? [];
        const retryable = overrides?.retryable ?? [];
        const failingIds = new Set(overrides?.failingIds ?? []);
        const emailsRepo = {
            findQueued: jest.fn(async (limit: number) => queued.slice(0, limit)),
            findRetryable: jest.fn(async () => retryable),
            countSentOn: jest.fn(async () => overrides?.sentToday ?? 0),
        } as never;
        const attempt = {
            attempt: jest.fn(async (id: bigint) => {
                if (failingIds.has(String(id))) throw new Error('boom');
                return email;
            }),
        } as never;
        const configRepo = { findConfiguration: jest.fn(async () => cfg) } as never;
        const useCase = new RetryDueEmailsUseCase(emailsRepo, attempt as never, configRepo as never);
        return {
            useCase,
            attempt: (attempt as unknown as { attempt: jest.Mock }).attempt,
            findQueued: (emailsRepo as unknown as { findQueued: jest.Mock }).findQueued,
            findRetryable: (emailsRepo as unknown as { findRetryable: jest.Mock }).findRetryable,
            countSentOn: (emailsRepo as unknown as { countSentOn: jest.Mock }).countSentOn,
        };
    };

    const withId = (id: bigint) => ({ ...email, id_email: id });

    it('processes QUEUED emails before retries, both through the attempt service', async () => {
        const { useCase, attempt, findQueued, findRetryable } = build({
            queued: [withId(100n), withId(101n)],
            retryable: [withId(200n)],
        });

        const result = await useCase.run({ data: null } as never);

        expect(result).toBe(3);
        expect(attempt.mock.calls.map(([id]) => String(id))).toEqual(['100', '101', '200']);
        expect(findQueued).toHaveBeenCalledWith(50);
        expect(findRetryable).toHaveBeenCalledTimes(1);
    });

    it('caps the total attempt() calls per tick by the remaining daily budget', async () => {
        const { useCase, attempt, findQueued, findRetryable, countSentOn } = build({
            queued: [withId(100n), withId(101n), withId(102n)],
            retryable: [withId(200n)],
            config: { ...config, daily_send_limit: 10 },
            sentToday: 9,
        });

        const result = await useCase.run({ data: null } as never);

        expect(result).toBe(1);
        expect(countSentOn).toHaveBeenCalledTimes(1);
        const [from, to] = countSentOn.mock.calls[0] as [Date, Date];
        expect(from.getHours()).toBe(0);
        expect(from.getMinutes()).toBe(0);
        expect(from.getSeconds()).toBe(0);
        expect(to.getTime()).toBeGreaterThan(from.getTime());
        expect(findQueued).toHaveBeenCalledWith(1);
        expect(findRetryable).not.toHaveBeenCalled();
        expect(attempt).toHaveBeenCalledTimes(1);
        expect(attempt).toHaveBeenCalledWith(100n);
    });

    it('processes nothing and exits early when the remaining daily budget is zero', async () => {
        const { useCase, attempt, findQueued, findRetryable } = build({
            queued: [withId(100n)],
            retryable: [withId(200n)],
            config: { ...config, daily_send_limit: 10 },
            sentToday: 10,
        });

        const result = await useCase.run({ data: null } as never);

        expect(result).toBe(0);
        expect(findQueued).not.toHaveBeenCalled();
        expect(findRetryable).not.toHaveBeenCalled();
        expect(attempt).not.toHaveBeenCalled();
    });

    it('applies no budget cap when the configuration has no daily_send_limit', async () => {
        const { useCase, attempt, countSentOn } = build({
            queued: [withId(100n)],
            retryable: [withId(200n)],
            config: { ...config, daily_send_limit: null },
        });

        const result = await useCase.run({ data: null } as never);

        expect(result).toBe(2);
        expect(attempt).toHaveBeenCalledTimes(2);
        expect(countSentOn).not.toHaveBeenCalled();
    });

    it('keeps processing the batch when a queued send fails (enters the normal retry machine)', async () => {
        const { useCase, attempt } = build({
            queued: [withId(100n), withId(101n)],
            retryable: [withId(200n)],
            failingIds: ['100'],
        });

        const result = await useCase.run({ data: null } as never);

        expect(result).toBe(3);
        expect(attempt.mock.calls.map(([id]) => String(id))).toEqual(['100', '101', '200']);
    });

    it('spends budget on every attempt() call, even on failures', async () => {
        const { useCase, attempt, findRetryable } = build({
            queued: [withId(100n)],
            retryable: [withId(200n), withId(201n)],
            config: { ...config, daily_send_limit: 10 },
            sentToday: 8,
            failingIds: ['100'],
        });

        const result = await useCase.run({ data: null } as never);

        expect(result).toBe(2);
        expect(findRetryable).toHaveBeenCalledTimes(1);
        expect(attempt).toHaveBeenCalledTimes(2);
    });
});
