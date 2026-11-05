import type { ISuppressionsRepository } from 'src/core/application/contracts/persistence';
import type { Suppression } from 'src/core/domain/entities/suppression.entity';
import { SuppressionReasonEnum } from 'src/core/domain/enum';

const DETAILS_MAX_LENGTH = 500;

export interface SuppressInput {
    /** null = platform-wide suppression. */
    id_client: bigint | null;
    email: string;
    reason: SuppressionReasonEnum;
    details?: string | null;
    source_email_id?: bigint | null;
}

export interface SuppressResult {
    suppression: Suppression;
    /** false when the (client, address) pair was already suppressed. */
    created: boolean;
}

export const normalizeSuppressedEmail = (email: string): string =>
    email.trim().toLowerCase();

/**
 * The single entry point to add or look up suppressions (S5): manual adds,
 * bounce/complaint ingestion and unsubscribe links all go through `suppress`,
 * which dedupes per (client, address); the send path uses `findBlocking`.
 */
export class SuppressionService {
    constructor(
        private readonly _suppressionsRepository: ISuppressionsRepository,
    ) {}

    public suppress = async (input: SuppressInput): Promise<SuppressResult> => {
        const email = normalizeSuppressedEmail(input.email);

        const existing =
            await this._suppressionsRepository.findByClientAndEmail(
                input.id_client,
                email,
            );
        if (existing !== null) {
            return { suppression: existing, created: false };
        }

        const suppression = await this._suppressionsRepository.create({
            id_client: input.id_client,
            email,
            reason: input.reason,
            details: input.details
                ? input.details.slice(0, DETAILS_MAX_LENGTH)
                : null,
            source_email_id: input.source_email_id ?? null,
        });

        return { suppression, created: true };
    };

    /**
     * First suppression that blocks any of the recipients. A client's email is
     * blocked by its own rows and platform-wide rows; an email without a
     * client (platform send) is blocked by any row of the address.
     */
    public findBlocking = async (
        recipients: string[],
        idClient: bigint | null,
    ): Promise<Suppression | null> => {
        for (const recipient of recipients) {
            const email = normalizeSuppressedEmail(recipient);
            if (email === '') continue;

            const rows =
                await this._suppressionsRepository.findAllByEmail(email);
            const blocking = rows.find(
                (row) =>
                    idClient === null ||
                    row.id_client === null ||
                    row.id_client === idClient,
            );
            if (blocking !== undefined) return blocking;
        }
        return null;
    };
}
