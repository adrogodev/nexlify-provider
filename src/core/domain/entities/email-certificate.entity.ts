/** Immutable certified-email evidence (S7): one row per certified email. */
export class EmailCertificate {
    constructor(
        public id_certificate: bigint,
        public certificate_uuid: string,
        public certificate_code: string,
        public id_email: bigint,
        public content_hash: string,
        public evidence_hash: string,
        /** Canonical JSON (stable key order) whose SHA-256 is `evidence_hash`. */
        public evidence: string,
        public issued_at: Date,
        public created_at: Nullable<Date>,
    ) {}
}
