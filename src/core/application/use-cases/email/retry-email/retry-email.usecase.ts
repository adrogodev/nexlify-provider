import type { IEmailsRepository } from "src/core/application/contracts/persistence";
import { SendEmailResultDTO } from "src/core/application/dtos";
import { EmailAttemptService } from "../services/email-attempt.service";
import { EmailStateEnum } from "src/core/domain/enum";
import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import { assertEmailAccess } from "../services/email-access";
import { UseCase, UseCaseArgs } from "src/core/domain/models";

export class RetryEmailUseCase implements UseCase<string, SendEmailResultDTO> {
    constructor(
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _attemptService: EmailAttemptService,
        private readonly _context: IRequestContext,
    ) { }

    public run = async (args: UseCaseArgs<string>): Promise<SendEmailResultDTO> => {
        const identifier = args.data;

        const email = assertEmailAccess(
            this._context.get(),
            await this._emailsRepository.findByUuidOrShortCode(identifier),
        );

        const attempted = await this._attemptService.attempt(email.id_email);

        return {
            email_uuid: email.email_uuid,
            short_code: email.short_code,
            state: attempted.state ?? EmailStateEnum.FAILED,
            attempts: attempted.attempts ?? 0,
        };
    };
}
