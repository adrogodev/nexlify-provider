import { RetryDueEmailsUseCase } from 'src/core/application/use-cases/email/retry-due/retry-due-emails.usecase';
import { EmailRetryScheduler } from './email-retry.scheduler.service';

describe('EmailRetryScheduler', () => {
    const retryUseCase = { run: jest.fn(async () => 2) } as unknown as RetryDueEmailsUseCase & { run: jest.Mock };

    it('runs the retry use case on every tick', async () => {
        const scheduler = new EmailRetryScheduler(retryUseCase);
        await scheduler.tick();
        expect(retryUseCase.run).toHaveBeenCalled();
    });

    it('survives a failing batch without throwing', async () => {
        const failing = { run: jest.fn(async () => { throw new Error('boom'); }) } as unknown as RetryDueEmailsUseCase;
        const scheduler = new EmailRetryScheduler(failing);
        await expect(scheduler.tick()).resolves.toBeUndefined();
    });

    it('starts and stops the interval on module lifecycle', () => {
        const scheduler = new EmailRetryScheduler(retryUseCase);
        jest.useFakeTimers();
        scheduler.onModuleInit();
        expect(scheduler.isRunning()).toBe(true);
        jest.advanceTimersByTime(31000);
        expect(retryUseCase.run).toHaveBeenCalled();
        scheduler.onModuleDestroy();
        expect(scheduler.isRunning()).toBe(false);
        jest.useRealTimers();
    });
});
