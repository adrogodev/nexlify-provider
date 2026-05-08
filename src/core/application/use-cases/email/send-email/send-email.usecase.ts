import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { SendEmailInput, SendEmailRequestData } from "./send-email.request-data";
import { IMailerService, MailerPayload } from "src/core/application/contracts/services";

export class SendEmailUseCase implements UseCase<SendEmailInput, boolean> {
    constructor(
        private readonly _mailerService: IMailerService
    ) { }

    public run = async (args: UseCaseArgs<SendEmailRequestData>): Promise<boolean> => {
        const { ...values } = args.data;

        const mailerPayload: MailerPayload = {
            transporter: {
                host: 'smtp.office365.com',
                port: 587,
                secure: false,
                user: 'test@mail.com',
                password: 'application_password'
            },
            email: {
                from: values.from,
                to: values.to,
                subject: values.subject,
                html: values.html,
                text: values.text,
                attachments: values.attachments,
            }
        }

        await this._mailerService.send(mailerPayload);
        return true;
    };
}