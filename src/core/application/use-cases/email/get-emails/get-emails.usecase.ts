import type { IRequestContext } from 'src/core/application/contracts/infrastructure';
import type {
    GetEmailsFilters,
    IEmailsRepository,
} from 'src/core/application/contracts/persistence';
import { EmailListItemDTO, PaginateBaseDTO } from 'src/core/application/dtos';
import { EmailMapper } from 'src/core/application/mappers';
import { UseCase, UseCaseArgs } from 'src/core/domain/models';

export class GetEmailsUseCase
    implements UseCase<GetEmailsFilters, PaginateBaseDTO<EmailListItemDTO[]>>
{
    constructor(
        private readonly _emailsRepository: IEmailsRepository,
        private readonly _context: IRequestContext,
    ) {}

    public run = async (
        args: UseCaseArgs<GetEmailsFilters>,
    ): Promise<PaginateBaseDTO<EmailListItemDTO[]>> => {
        const auth = this._context.get();
        const requested = args.data ?? {};
        // Clients only list their own emails, whatever id_client the query carries.
        const filters: GetEmailsFilters =
            auth.is_admin === true
                ? requested
                : { ...requested, id_client: BigInt(auth.id_user) };

        const [total_items, emails] = await Promise.all([
            this._emailsRepository.countWithFilters(filters),
            this._emailsRepository.getAllWithFilters(filters),
        ]);

        return {
            total_items,
            page: Math.max(1, filters.page ?? 1),
            data: emails.map((email) => EmailMapper.mapEmailListItem(email)),
        };
    };
}
