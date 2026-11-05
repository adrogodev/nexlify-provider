export class EmailEventSubscription {
    constructor(
        public id_subscription: bigint,
        public subscription_uuid: string,
        public id_client: bigint,
        public id_webhook_endpoint: bigint,
        public events: string,
        public include_body: boolean,
        public include_dates: boolean,
        public include_sender: boolean,
        public include_recipients: boolean,
        public include_attachments: boolean,
        /** S8: RECEIVED_REPLY payloads carry `ai_analysis`. */
        public include_ai_analysis: boolean,
        public is_active: boolean,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>
    ) { }
}
