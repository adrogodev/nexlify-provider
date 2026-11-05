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
            variables: TemplateMapper.parseVariables(template.variables),
            category: template.category ?? null,
            locale: template.locale ?? null,
            created_at: template.created_at
        };
    }

    /** `templates.variables` holds a JSON string[]; anything else reads as no variables. */
    public static parseVariables(raw: Nullable<string> | undefined): string[] {
        if (!raw) return [];
        try {
            const parsed: unknown = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
        } catch {
            return [];
        }
    }

    public static serializeVariables(variables: string[] | undefined): string | undefined {
        return variables === undefined ? undefined : JSON.stringify(variables);
    }
}
