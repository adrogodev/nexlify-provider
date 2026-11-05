export class SendingDomain {
    constructor(
        public id_domain: bigint,
        public domain_uuid: string,
        public id_client: Nullable<bigint>,
        public domain: string,
        public dkim_selector: string,
        /** Base64 DER (SPKI) public key: the `p=` value of the DKIM TXT record. */
        public dkim_public_key: string,
        /** PKCS#8 PEM private key, encrypted at rest with ENCRYPT_KEY (AES-GCM). */
        public dkim_private_key: string,
        public spf_verified: boolean,
        public dkim_verified: boolean,
        public dmarc_verified: boolean,
        public last_checked_at: Nullable<Date>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>,
    ) {}
}
