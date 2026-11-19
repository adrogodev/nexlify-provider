import type { IEmailAttachmentsRepository, IEmailsRepository } from "src/core/application/contracts/persistence";
import { EmailAttachmentContentDTO } from "src/core/application/dtos";
import { NotFoundException } from "src/core/domain/exceptions";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import { assertEmailAccess } from "../services/email-access";

/**
 * Downloads one attachment of an email by its list index (S6 read side), the
 * order being the ingestion order. Carries the stored base64 and content-type;
 * an out-of-range index is NotFound, exactly like an unknown email.
 */
export class DownloadEmailAttachmentUseCase implements UseCase<{ emailId: string; index: number }, EmailAttachmentContentDTO> {
    constructor(
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _emailAttachmentsRepository: IEmailAttachmentsRepository,
        private readonly _context: IRequestContext,
    ) { }

    public run = async (args: UseCaseArgs<{ emailId: string; index: number }>): Promise<EmailAttachmentContentDTO> => {
        const { emailId, index } = args.data;

        const email = assertEmailAccess(
            this._context.get(),
            await this._emailsRepository.findByUuidOrShortCode(emailId),
        );

        const attachments = await this._emailAttachmentsRepository.findByEmail(email.id_email);
        const attachment = attachments[index];
        if (attachment === undefined) {
            throw new NotFoundException('El archivo adjunto solicitado no existe');
        }

        return {
            filename: attachment.filename,
            content_type: attachment.content_type,
            size_bytes: attachment.size_bytes,
            content_base64: attachment.content,
        };
    };
}
