import type { IEmailsRepository, INexlifyConfigurationRepository } from "src/core/application/contracts/persistence";
import type { Email } from "src/core/domain/entities/email.entity";
import { EmailAttemptService } from "../services/email-attempt.service";
import { UseCase, UseCaseArgs } from "src/core/domain/models";

const QUEUED_BATCH_LIMIT = 50;

/**
 * Scheduled tick: first sends QUEUED emails (pending first send), then overdue
 * retries. Every attempt goes through the shared attempt service, so a failure
 * enters the normal RETRYING/FAILED machine. The total number of attempt()
 * calls per tick never exceeds the remaining daily budget, and a single
 * failing email never breaks the batch.
 */
export class RetryDueEmailsUseCase implements UseCase<null, number> {
    constructor(
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _attemptService: EmailAttemptService,
        private readonly _configurationsRepository?: INexlifyConfigurationRepository,
    ) { }

    public run = async (_args: UseCaseArgs<null>): Promise<number> => {
        const budget = await this.#remainingDailyBudget();
        if (budget === 0) {
            return 0;
        }

        let budgetLeft: number = budget ?? Infinity;
        let processed = 0;

        const queued = await this._emailsRepository.findQueued(Math.min(QUEUED_BATCH_LIMIT, budgetLeft));
        for (const email of queued) {
            if (budgetLeft <= 0) break;
            await this.#attempt(email);
            processed++;
            budgetLeft--;
        }
        if (budgetLeft <= 0) {
            return processed;
        }

        const due = await this._emailsRepository.findRetryable(new Date());
        for (const email of due) {
            if (budgetLeft <= 0) break;
            await this.#attempt(email);
            processed++;
            budgetLeft--;
        }

        return processed;
    };

    async #attempt(email: Email): Promise<void> {
        try {
            await this._attemptService.attempt(email.id_email);
        } catch {
            // Keep processing the rest of the batch; the failure is already
            // recorded by the attempt service or will be retried again.
        }
    }

    /** `null` means the configuration applies no daily limit. */
    async #remainingDailyBudget(): Promise<number | null> {
        if (this._configurationsRepository === undefined) return null;

        const configuration = await this._configurationsRepository.findConfiguration();
        const dailySendLimit = configuration?.daily_send_limit;
        if (dailySendLimit === null || dailySendLimit === undefined) return null;

        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const sentToday = await this._emailsRepository.countSentOn(startOfDay, now);

        return Math.max(0, dailySendLimit - sentToday);
    }
}
