import { Template } from "src/core/domain/entities/template.entity";
import { TemplateInfoDTO } from "../dtos";

export class TemplateMapper {
    public static mapTemplate(template: Template): TemplateInfoDTO {
        return {
            id_template: template.id_template,
            name: template.name,
            subject: template.subject,
            template: template.template,
            is_active: template.is_active,
            created_at: template.created_at
        };
    }
}
