import { SuppressionReasonEnum } from 'src/core/domain/enum';

export interface SuppressionDTO {
    suppression_uuid: string;
    id_client: number | null;
    email: string;
    reason: SuppressionReasonEnum;
    details: string | null;
    /** Public uuid of the email that caused the suppression, when known. */
    source_email_id: string | null;
    created_at: Date | null;
}
