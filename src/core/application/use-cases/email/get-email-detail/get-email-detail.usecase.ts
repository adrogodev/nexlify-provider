import type { IEmailsRepository, IEmailSendLogsRepository } from "src/core/application/contracts/persistence";
import { EmailDetailDTO } from "src/core/application/dtos";
import { EmailMapper } from "src/core/application/mappers";
import { NotFoundException } from "src/core/domain/exceptions";
import { UseCase, UseCaseArgs } from "src/core/domain/models";

export class GetEmailDetailUseCase implements UseCase<string, EmailDetailDTO> {
    constructor(
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _emailSendLogsRepository: IEmailSendLogsRepository,
    ) { }

    public run = async (args: UseCaseArgs<string>): Promise<EmailDetailDTO> => {
        const identifier = args.data;

        const email = await this._emailsRepository.findByUuidOrShortCode(identifier);
        if (email === null) {
            throw new NotFoundException('El correo solicitado no existe');
        }

        const logs = await this._emailSendLogsRepository.findByEmail(email.id_email);

        return EmailMapper.mapEmailDetail(email, logs);
    };
}
