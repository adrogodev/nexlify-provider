/** Renders the certified-email PDF (S7) from the already-hashed evidence. */
export const CERTIFICATE_PDF_RENDERER = Symbol('ICertificatePdfRenderer');

export interface CertificatePdfAttempt {
    timestamp: string | null;
    level: string | null;
    smtp_host: string | null;
    message: string;
}

export interface CertificatePdfData {
    certificate_code: string;
    issued_at: Date;
    email_uuid: string;
    short_code: string;
    from_email: string;
    to_email: string;
    subject: string;
    message_id: string | null;
    content_hash: string;
    evidence_hash: string;
    attempts: CertificatePdfAttempt[];
    replies: Array<{
        short_code: string;
        from_email: string;
        received_at: string | null;
        subject: string;
    }>;
    verify_url: string;
}

export interface ICertificatePdfRenderer {
    render(data: CertificatePdfData): Promise<Buffer>;
}
