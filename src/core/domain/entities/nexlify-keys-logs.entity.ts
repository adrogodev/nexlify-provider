export class NexlifyKeysLogs {
    constructor(
        public id_nexlify_key_log: bigint,
        public id_client: Nullable<bigint>,
        public api_key: Nullable<string>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>,
    ) { }
}
