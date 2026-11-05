export enum EmailStateEnum {
    QUEUED = 'QUEUED',
    SENDING = 'SENDING',
    SENT = 'SENT',
    WARNING = 'WARNING',
    FAILED = 'FAILED',
    RETRYING = 'RETRYING',
    RECEIVED = 'RECEIVED',
    /** A bounce/complaint was reported by the provider for this email (S5). */
    BOUNCED = 'BOUNCED',
    /** Never sent: a recipient is on the suppression list (S5). */
    SUPPRESSED = 'SUPPRESSED',
}
