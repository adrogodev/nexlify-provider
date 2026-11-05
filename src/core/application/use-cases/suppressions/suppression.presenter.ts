import type { IEmailsRepository } from 'src/core/application/contracts/persistence';
import type { SuppressionDTO } from 'src/core/application/dtos';
import type { Suppression } from 'src/core/domain/entities/suppression.entity';

/**
 * Public shape of a suppression row. The source email is exposed by its public
 * uuid (the internal BigInt PK is never exposed).
 */
export const toSuppressionDTO = async (
    suppression: Suppression,
    emailsRepository: IEmailsRepository,
): Promise<SuppressionDTO> => {
    let sourceEmailUuid: string | null = null;
    if (
        suppression.source_email_id !== null &&
        suppression.source_email_id !== undefined
    ) {
        const email = await emailsRepository.getByIdAsync(
            suppression.source_email_id,
        );
        sourceEmailUuid = email?.email_uuid ?? null;
    }
    return {
        suppression_uuid: suppression.suppression_uuid,
        id_client:
            suppression.id_client === null ||
            suppression.id_client === undefined
                ? null
                : Number(suppression.id_client),
        email: suppression.email,
        reason: suppression.reason,
        details: suppression.details ?? null,
        source_email_id: sourceEmailUuid,
        created_at: suppression.created_at ?? null,
    };
};
