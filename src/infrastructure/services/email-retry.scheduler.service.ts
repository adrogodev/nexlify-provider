import { colors } from '@gamastudio/colorslog';
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { RetryDueEmailsUseCase } from 'src/core/application/use-cases/email/retry-due/retry-due-emails.usecase';

export const RETRY_SCHEDULER_INTERVAL_MS = 30_000;

@Injectable()
export class EmailRetryScheduler implements OnModuleInit, OnModuleDestroy {
    #intervalHandle: ReturnType<typeof setInterval> | null = null;
    #running = false;

    constructor(
        private readonly _retryDueEmailsUseCase: RetryDueEmailsUseCase,
    ) { }

    public onModuleInit(): void {
        this.#intervalHandle = setInterval(() => { void this.tick(); }, RETRY_SCHEDULER_INTERVAL_MS);
    }

    public onModuleDestroy(): void {
        if (this.#intervalHandle !== null) {
            clearInterval(this.#intervalHandle);
            this.#intervalHandle = null;
        }
    }

    public isRunning(): boolean {
        return this.#intervalHandle !== null;
    }

    /** Bounded and idempotent: overlapping ticks are skipped. */
    public tick = async (): Promise<void> => {
        if (this.#running) return;
        this.#running = true;
        try {
            const processed = await this._retryDueEmailsUseCase.run({ data: null });
            if (processed > 0) {
                colors.info(`Reintentos de correo procesados: ${processed}`, { dateShow: false });
            }
        } catch (error) {
            colors.error(`Error en el scheduler de reintentos de correo: ${error}`, { dateShow: false });
        } finally {
            this.#running = false;
        }
    };
}
