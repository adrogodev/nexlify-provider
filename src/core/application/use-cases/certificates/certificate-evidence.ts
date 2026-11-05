import type { EmailCertificate } from 'src/core/domain/entities/email-certificate.entity';
import type { EmailSendLog } from 'src/core/domain/entities/email-send-log.entity';
import type { Email } from 'src/core/domain/entities/email.entity';

export const CERTIFICATE_CODE_PREFIX = 'NXC';
export const CERTIFICATE_CODE_LENGTH = 10;
export const EVIDENCE_VERSION = 1;

/**
 * Exact text whose SHA-256 is the certificate `content_hash`:
 * `subject + "\n" + body_html + "\n" + body_text` (null bodies as "").
 */
export function contentHashInput(
    email: Pick<Email, 'subject' | 'body_html' | 'body_text'>,
): string {
    return `${email.subject ?? ''}\n${email.body_html ?? ''}\n${email.body_text ?? ''}`;
}

/**
 * Canonical JSON: object keys sorted recursively, no whitespace, bigint as
 * string, Date as ISO-8601. The same evidence always serializes to the same
 * bytes, so its SHA-256 is reproducible by any third party.
 */
export function canonicalJson(value: unknown): string {
    return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(normalize);
    if (typeof value === 'object') {
        const sorted: Record<string, unknown> = {};
        for (const key of Object.keys(
            value as Record<string, unknown>,
        ).sort()) {
            sorted[key] = normalize((value as Record<string, unknown>)[key]);
        }
        return sorted;
    }
    return value;
}

export interface CertificateEvidence {
    version: number;
    platform: string;
    certificate_code: string;
    issued_at: string;
    content_hash: string;
    email: {
        email_uuid: string;
        short_code: string;
        id_client: string | null;
        from_email: string;
        to_email: string;
        subject: string;
        message_id: string | null;
        state: string | null;
        attempts: number | null;
        created_at: string | null;
        sent_at: string | null;
    };
    attempts: Array<{
        attempt: number;
        level: string | null;
        smtp_host: string | null;
        message: string;
        created_at: string | null;
    }>;
    replies: Array<{
        email_uuid: string;
        short_code: string;
        from_email: string;
        subject: string;
        received_at: string | null;
    }>;
}

const iso = (date: Date | null | undefined): string | null =>
    date instanceof Date ? date.toISOString() : null;

/** Evidence snapshot: email identity, every attempt log (chronological) and the reply chain. No body content. */
export function buildEvidence(args: {
    certificateCode: string;
    issuedAt: Date;
    contentHash: string;
    email: Email;
    logs: EmailSendLog[];
    replies: Email[];
}): CertificateEvidence {
    const logs = [...args.logs].sort(
        (a, b) =>
            (a.created_at?.getTime() ?? 0) - (b.created_at?.getTime() ?? 0) ||
            Number(a.id_log - b.id_log),
    );
    const replies = [...args.replies].sort(
        (a, b) =>
            (a.created_at?.getTime() ?? 0) - (b.created_at?.getTime() ?? 0),
    );
    return {
        version: EVIDENCE_VERSION,
        platform: 'Nexlify',
        certificate_code: args.certificateCode,
        issued_at: args.issuedAt.toISOString(),
        content_hash: args.contentHash,
        email: {
            email_uuid: args.email.email_uuid,
            short_code: args.email.short_code,
            id_client:
                args.email.id_client === null ||
                args.email.id_client === undefined
                    ? null
                    : args.email.id_client.toString(),
            from_email: args.email.from_email,
            to_email: args.email.to_email,
            subject: args.email.subject,
            message_id: args.email.message_id ?? null,
            state: args.email.state ?? null,
            attempts: args.email.attempts ?? null,
            created_at: iso(args.email.created_at),
            sent_at: iso(args.email.sent_at),
        },
        attempts: logs.map((log) => ({
            attempt: log.attempt,
            level: log.level ?? null,
            smtp_host: log.smtp_host ?? null,
            message: log.message,
            created_at: iso(log.created_at),
        })),
        replies: replies.map((reply) => ({
            email_uuid: reply.email_uuid,
            short_code: reply.short_code,
            from_email: reply.from_email,
            subject: reply.subject,
            received_at: iso(reply.created_at),
        })),
    };
}

export interface CertificateDTO {
    certificate_uuid: string;
    certificate_code: string;
    issued_at: Date;
    content_hash: string;
    evidence_hash: string;
    verify_url: string;
}

export function buildVerifyUrl(
    publicApiUrl: string,
    certificateCode: string,
): string {
    return `${publicApiUrl.replace(/\/+$/, '')}/api/certificates/${encodeURIComponent(certificateCode)}/verify`;
}

export function toCertificateDTO(
    certificate: EmailCertificate,
    publicApiUrl: string,
): CertificateDTO {
    return {
        certificate_uuid: certificate.certificate_uuid,
        certificate_code: certificate.certificate_code,
        issued_at: certificate.issued_at,
        content_hash: certificate.content_hash,
        evidence_hash: certificate.evidence_hash,
        verify_url: buildVerifyUrl(publicApiUrl, certificate.certificate_code),
    };
}

/** `juan.perez@empresa.com` -> `j***@e***.com`; each comma-separated recipient is masked. */
export function maskRecipients(toEmail: string): string {
    return toEmail
        .split(',')
        .map((address) => address.trim())
        .filter((address) => address !== '')
        .map((address) => {
            const [local, domain] = address.split('@');
            if (domain === undefined) return `${local.slice(0, 1)}***`;
            const dot = domain.lastIndexOf('.');
            const domainName = dot > 0 ? domain.slice(0, dot) : domain;
            const tld = dot > 0 ? domain.slice(dot) : '';
            return `${local.slice(0, 1)}***@${domainName.slice(0, 1)}***${tld}`;
        })
        .join(', ');
}
