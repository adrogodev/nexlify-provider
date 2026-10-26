import type { IEmailsRepository, GetEmailsFilters } from "src/core/application/contracts/persistence";
import { EmailListItemDTO, PaginateBaseDTO } from "src/core/application/dtos";
import { EmailMapper } from "src/core/application/mappers";
import { UseCase, UseCaseArgs } from "src/core/domain/models";

export class GetEmailsUseCase implements UseCase<GetEmailsFilters, PaginateBaseDTO<EmailListItemDTO[]>> {
    constructor(
        private readonly _emailsRepository: IEmailsRepository,
    ) { }

    public run = async (args: UseCaseArgs<GetEmailsFilters>): Promise<PaginateBaseDTO<EmailListItemDTO[]>> => {
        const filters = args.data ?? {};

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
