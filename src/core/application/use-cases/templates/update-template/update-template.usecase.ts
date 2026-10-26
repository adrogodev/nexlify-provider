import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import type { EntityUpdateInput, ITemplatesRepository } from "src/core/application/contracts/persistence";
import type { TemplateInfoDTO } from "src/core/application/dtos";
import { ActionNotAllowedException, NotFoundException } from "src/core/domain/exceptions";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { TemplateMapper } from "src/core/application/mappers";
import type { Template } from "src/core/domain/entities/template.entity";
import { UpdateTemplateInput } from "./update-template.request-data";

export class UpdateTemplateUseCase implements UseCase<UpdateTemplateInput, TemplateInfoDTO> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _templatesRepository: ITemplatesRepository,
    ) { }

    public run = async (args: UseCaseArgs<UpdateTemplateInput>): Promise<TemplateInfoDTO> => {
        const auth = this._context.get();
        const authIsAdmin = auth?.is_admin === true;

        if (!authIsAdmin) {
            throw new ActionNotAllowedException('Solo un administrador puede modificar plantillas');
        }

        const template = await this._templatesRepository.getByIdAsync(args.data.id_template);
        if (!template) throw new NotFoundException('Plantilla no encontrada');

        // Only content fields plus the active toggle: the name and the
        // auto uuid PK/timestamps are never part of the patch.
        const patch: EntityUpdateInput<Template, 'id_template'> = {
            subject: args.data.subject,
            template: args.data.template,
            is_active: args.data.is_active,
        };

        const updated = await this._templatesRepository.update(args.data.id_template, patch);

        return TemplateMapper.mapTemplate(updated ?? template);
    };
}
