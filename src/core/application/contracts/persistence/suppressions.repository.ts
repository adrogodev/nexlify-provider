import { Suppression } from 'src/core/domain/entities/suppression.entity';
import { SuppressionReasonEnum } from 'src/core/domain/enum';
import type { EntityInput, IBaseRepository } from './base.repository';

export const SUPPRESSIONS_REPOSITORY = Symbol('ISuppressionsRepository');

export interface GetSuppressionsFilters {
    id_client?: bigint;
    email?: string;
    reason?: SuppressionReasonEnum;
    page?: number;
    limit?: number;
}

export interface ISuppressionsRepository
    extends IBaseRepository<Suppression, 'id_suppression'> {
    /** suppression_uuid is DB-side generated (gen_random_uuid): allowed to omit on create. */
    create(
        entity: Omit<
            EntityInput<Suppression, 'id_suppression'>,
            'suppression_uuid'
        > &
            Partial<Pick<Suppression, 'suppression_uuid'>>,
    ): Promise<Suppression>;
    findByUuid(suppressionUuid: string): Promise<Suppression | null>;
    /** Exact (client, address) row: the dedupe key. `null` client = platform-wide row. */
    findByClientAndEmail(
        idClient: bigint | null,
        email: string,
    ): Promise<Suppression | null>;
    /**
     * Every suppression row of an address (case-insensitive), any client:
     * the send path decides which ones apply.
     */
    findAllByEmail(email: string): Promise<Suppression[]>;
    getAllWithFilters(filters: GetSuppressionsFilters): Promise<Suppression[]>;
    countWithFilters(filters: GetSuppressionsFilters): Promise<number>;
}
