import type { IRequestContext } from 'src/core/application/contracts/infrastructure';
import type {
    GetSuppressionsFilters,
    IEmailsRepository,
    ISuppressionsRepository,
} from 'src/core/application/contracts/persistence';
import type {
    PaginateBaseDTO,
    SuppressionDTO,
} from 'src/core/application/dtos';
import { UseCase, UseCaseArgs } from 'src/core/domain/models';
import { toSuppressionDTO } from '../suppression.presenter';
import type { ListSuppressionsInput } from './list-suppressions.request-data';

/** Paginated suppression list: clients see their own rows, admins all (optional id_client filter). */
export class ListSuppressionsUseCase
    implements UseCase<ListSuppressionsInput, PaginateBaseDTO<SuppressionDTO[]>>
{
    constructor(
        private readonly _context: IRequestContext,
        private readonly _suppressionsRepository: ISuppressionsRepository,
        private readonly _emailsRepository: IEmailsRepository,
    ) {}

    public run = async (
        args: UseCaseArgs<ListSuppressionsInput>,
    ): Promise<PaginateBaseDTO<SuppressionDTO[]>> => {
        const auth = this._context.get();
        const data = args.data ?? {};

        const filters: GetSuppressionsFilters = {
            id_client:
                auth?.is_admin === true
                    ? data.id_client === undefined || data.id_client === null
                        ? undefined
                        : BigInt(data.id_client)
                    : BigInt(auth.id_user),
            email: data.email,
            reason: data.reason,
            page: data.page,
            limit: data.limit,
        };

        const [total_items, rows] = await Promise.all([
            this._suppressionsRepository.countWithFilters(filters),
            this._suppressionsRepository.getAllWithFilters(filters),
        ]);

        return {
            total_items,
            page: Math.max(1, data.page ?? 1),
            data: await Promise.all(
                rows.map((row) =>
                    toSuppressionDTO(row, this._emailsRepository),
                ),
            ),
        };
    };
}
