export interface EmailAttachment {
    filename?: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
    encoding?: string;
    cid?: string;
}