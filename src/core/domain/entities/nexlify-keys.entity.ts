export class NexlifyKeys {
    constructor(
        public id_nexlify_key: bigint,
        public id_client: Nullable<bigint>,
        public api_key: Nullable<string>,
        public state: Nullable<boolean>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>,
    ) { }
}
