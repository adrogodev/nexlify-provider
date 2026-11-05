import { SuppressionReasonEnum } from '../enum';

export class Suppression {
    constructor(
        public id_suppression: bigint,
        public suppression_uuid: string,
        /** null = platform-wide suppression (applies to every client). */
        public id_client: Nullable<bigint>,
        public email: string,
        public reason: SuppressionReasonEnum,
        public source_email_id: Nullable<bigint>,
        public details: Nullable<string>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>,
    ) {}
}
