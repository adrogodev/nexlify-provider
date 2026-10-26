import type { IEmailsRepository } from "src/core/application/contracts/persistence";
import type { Email } from "src/core/domain/entities/email.entity";
import { EmailAttemptService } from "../services/email-attempt.service";
import { UseCase, UseCaseArgs } from "src/core/domain/models";

/**
 * Re-sends every email whose retry schedule is due. A single failing email
 * never breaks the batch: its error is swallowed so the remaining retries run.
 */
export class RetryDueEmailsUseCase implements UseCase<null, number> {
    constructor(
        private readonly _emailsRetriever: { findRetryable(before: Date): Promise<Email[]> },
        private readonly _attemptService: EmailAttemptService,
    ) { }

    public run = async (_args: UseCaseArgs<null>): Promise<number> => {
        const due = await this._emailsRetriever.findRetryable(new Date());

        for (const email of due) {
            try {
                await this._attemptService.attempt(email.id_email);
            } catch {
                // Keep processing the rest of the batch; the failure is already
                // recorded by the attempt service or will be retried again.
            }
        }

        return due.length;
    };
}
