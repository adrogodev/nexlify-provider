export interface SendingDomainDnsRecordDTO {
    type: 'TXT';
    host: string;
    value: string;
    purpose: 'SPF' | 'DKIM' | 'DMARC';
    verified: boolean;
}

export interface SendingDomainDTO {
    domain_uuid: string;
    domain: string;
    id_client: number | null;
    dkim_selector: string;
    spf_verified: boolean;
    dkim_verified: boolean;
    dmarc_verified: boolean;
    last_checked_at: Date | null;
    created_at: Date | null;
    dns_records: SendingDomainDnsRecordDTO[];
}

export interface DeletedDTO {
    deleted: true;
}
