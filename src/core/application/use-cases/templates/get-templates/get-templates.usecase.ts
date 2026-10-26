import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import type { ITemplatesRepository } from "src/core/application/contracts/persistence";
import type { PaginateBaseDTO, TemplateInfoDTO } from "src/core/application/dtos";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { TemplateMapper } from "src/core/application/mappers";
import { GetTemplatesInput, toGetTemplatesFilters } from "./get-templates.request-data";

export class GetTemplatesUseCase implements UseCase<GetTemplatesInput, PaginateBaseDTO<TemplateInfoDTO[]>> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _templatesRepository: ITemplatesRepository,
    ) { }

    public run = async (args: UseCaseArgs<GetTemplatesInput>): Promise<PaginateBaseDTO<TemplateInfoDTO[]>> => {
        const auth = this._context.get();
        const authIsAdmin = auth?.is_admin === true;

        const filters = toGetTemplatesFilters(args.data);
        // Non-admin callers only ever see active templates; admins see all of
        // them (the is_active filter stays unset for the full list).
        if (!authIsAdmin) filters.is_active = true;

        const [total_items, templates] = await Promise.all([
            this._templatesRepository.countWithFilters(filters),
            this._templatesRepository.getAllWithFilters(filters),
        ]);

        return {
            total_items,
            page: Math.max(1, args.data?.page ?? 1),
            data: templates.map((template) => TemplateMapper.mapTemplate(template)),
        };
    };
}
