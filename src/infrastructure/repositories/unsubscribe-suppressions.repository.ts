import { Inject, Injectable } from '@nestjs/common';
import { SUPPRESSIONS_REPOSITORY, type ISuppressionsRepository } from 'src/core/application/contracts/persistence';
import type { IUnsubscribeSuppressionsRepository } from 'src/core/application/contracts/persistence/unsubscribe-suppressions.repository';
import { SuppressionReasonEnum } from 'src/core/domain/enum';

/**
 * Writer for AI-detected unsubscribe requests (S8). Delegates to the
 * suppressions repository (S5) so dedupe (client + case-insensitive email)
 * and persistence live in a single place.
 */
@Injectable()
export class UnsubscribeSuppressionsRepository implements IUnsubscribeSuppressionsRepository {
    constructor(
        @Inject(SUPPRESSIONS_REPOSITORY)
        private readonly _suppressions: ISuppressionsRepository,
    ) {}

    public async addUnsubscribe(args: {
        id_client: bigint | null;
        email: string;
        source_email_id: bigint;
        details: string | null;
    }): Promise<boolean> {
        const email = args.email.trim().toLowerCase();
        const existing = await this._suppressions.findByClientAndEmail(args.id_client, email);
        if (existing !== null) {
            return false;
        }
        await this._suppressions.create({
            id_client: args.id_client,
            email,
            reason: SuppressionReasonEnum.UNSUBSCRIBE,
            source_email_id: args.source_email_id,
            details: args.details === null ? null : args.details.slice(0, 500),
        });
        return true;
    }
}
