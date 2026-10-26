export class WebhookDelivery {
    constructor(
        public id_delivery: bigint,
        public id_endpoint: bigint,
        public id_email: bigint,
        public event: string,
        public attempt: number,
        public ok: Nullable<boolean>,
        public status_code: Nullable<number>,
        public error: Nullable<string>,
        public next_retry_at: Nullable<Date>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>
    ) { }
}
