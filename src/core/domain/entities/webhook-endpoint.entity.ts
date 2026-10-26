export class WebhookEndpoint {
    constructor(
        public id_endpoint: bigint,
        public endpoint_uuid: string,
        public id_client: Nullable<bigint>,
        public url: string,
        public secret: string,
        public is_active: boolean,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>
    ) { }
}
