import type { IEmailAttachmentsRepository, IEmailsRepository, IEmailSendLogsRepository } from "src/core/application/contracts/persistence";
import { EmailDetailDTO } from "src/core/application/dtos";
import { EmailMapper } from "src/core/application/mappers";
import { NotFoundException } from "src/core/domain/exceptions";
import { UseCase, UseCaseArgs } from "src/core/domain/models";

/**
 * Full detail of an email (S6 read side): state machine fields, spend logs,
 * the thread direction + parent link and the attachments metadata list
 * (filenames/sizes/content-types; the binary content only travels over the
 * dedicated attachment download endpoint).
 */
export class GetEmailDetailUseCase implements UseCase<string, EmailDetailDTO> {
    constructor(
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _emailSendLogsRepository: IEmailSendLogsRepository,
        private readonly _emailAttachmentsRepository: IEmailAttachmentsRepository,
    ) { }

    public run = async (args: UseCaseArgs<string>): Promise<EmailDetailDTO> => {
        const identifier = args.data;

        const email = await this._emailsRepository.findByUuidOrShortCode(identifier);
        if (email === null) {
            throw new NotFoundException('El correo solicitado no existe');
        }

        const logs = await this._emailSendLogsRepository.findByEmail(email.id_email);
        const attachments = await this._emailAttachmentsRepository.findByEmail(email.id_email);

        const parentEmail = email.parent_email_id === null || email.parent_email_id === undefined
            ? null
            : await this._emailsRepository.getByIdAsync(email.parent_email_id);

        return EmailMapper.mapEmailDetail(email, logs, attachments, parentEmail?.email_uuid ?? null);
    };
}
