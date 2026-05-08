import { EmailAttachment } from "./attachment.model";

export interface TransporterData {
    host: string,
    port: number,
    secure: boolean,
    user: string,
    password: string
}

export interface EmailPayload {
    from: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    attachments?: EmailAttachment[];
}