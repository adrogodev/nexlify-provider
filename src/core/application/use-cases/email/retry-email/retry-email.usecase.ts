import type { IEmailsRepository } from "src/core/application/contracts/persistence";
import { SendEmailResultDTO } from "src/core/application/dtos";
import { EmailAttemptService } from "../services/email-attempt.service";
import { EmailStateEnum } from "src/core/domain/enum";
import { NotFoundException } from "src/core/domain/exceptions";
import { UseCase, UseCaseArgs } from "src/core/domain/models";

export class RetryEmailUseCase implements UseCase<string, SendEmailResultDTO> {
    constructor(
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _attemptService: EmailAttemptService,
    ) { }

    public run = async (args: UseCaseArgs<string>): Promise<SendEmailResultDTO> => {
        const identifier = args.data;

        const email = await this._emailsRepository.findByUuidOrShortCode(identifier);
        if (email === null) {
            throw new NotFoundException('El correo solicitado no existe');
        }

        const attempted = await this._attemptService.attempt(email.id_email);

        return {
            email_uuid: email.email_uuid,
            short_code: email.short_code,
            state: attempted.state ?? EmailStateEnum.FAILED,
            attempts: attempted.attempts ?? 0,
        };
    };
}
