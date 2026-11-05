import { EmailAttachment } from "./attachment.model";

export interface TransporterData {
    host: string,
    port: number,
    secure: boolean,
    user: string,
    password: string
}

/** Per-message DKIM signing options (nodemailer `dkim`). */
export interface DkimSigningOptions {
    domainName: string;
    keySelector: string;
    privateKey: string;
}

export interface EmailPayload {
    from: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    attachments?: EmailAttachment[];
    /** Extra message headers (e.g. List-Unsubscribe). */
    headers?: Record<string, string>;
    /** DKIM signature for a verified sending domain. */
    dkim?: DkimSigningOptions;
}