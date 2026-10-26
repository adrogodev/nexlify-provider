import { EmailPayload, TransporterData } from "src/core/domain/models"

export const MAILER_SERVICE = Symbol('IMailerService')

export interface MailerPayload {
    transporter: TransporterData,
    email: EmailPayload
}

export interface MailerResult {
    ok: boolean,
    /** Human-readable outcome: success confirmation or the failure message. */
    message: string,
    /** Nodemailer Message-ID of the sent email (present only on success): inbound replies are threaded by it. */
    messageId?: string
}

export interface IMailerService {
    send(payload: MailerPayload): Promise<MailerResult>
}