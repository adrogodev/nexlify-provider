import type { ITemplatesRepository } from 'src/core/application/contracts/persistence';
import {
    extractPlaceholders,
    renderPlaceholders,
} from 'src/core/application/tools/template-render.tool';
import {
    NotFoundException,
    NotMatchException,
    ValidationException,
} from 'src/core/domain/exceptions';

export interface TemplateContentInput {
    id_template?: string;
    variables?: Record<string, unknown>;
    subject?: string;
    html?: string;
    text?: string;
}

export interface ResolvedEmailContent {
    subject: string;
    html: string | null;
    text: string | null;
    id_template: string | null;
    /** JSON of the variables used to render (null when no template was used). */
    template_variables: string | null;
}

/**
 * Resolves the final subject/html/text of an outbound email (S2). Without a
 * template the explicit content is returned untouched. With `id_template`
 * the template provides subject + HTML body (explicit values override it),
 * every `{{placeholder}}` must have a value (400 listing the missing ones)
 * and values are HTML-escaped only inside the HTML body.
 */
export class TemplateContentService {
    constructor(private readonly _templatesRepository: ITemplatesRepository) {}

    public resolve = async (
        input: TemplateContentInput,
    ): Promise<ResolvedEmailContent> => {
        if (input.id_template === undefined || input.id_template === null) {
            if (!input.subject) throw this.#subjectRequired();
            return {
                subject: input.subject,
                html: input.html ?? null,
                text: input.text ?? null,
                id_template: null,
                template_variables: null,
            };
        }

        const template = await this._templatesRepository.getByIdAsync(
            input.id_template,
        );
        if (template === null || template.is_active === false) {
            throw new NotFoundException('Plantilla no encontrada');
        }

        const subject = input.subject ?? template.subject ?? null;
        if (!subject) throw this.#subjectRequired();
        const html = input.html ?? template.template ?? null;
        const text = input.text ?? null;

        const variables = this.#stringify(input.variables ?? {});
        const required = new Set([
            ...extractPlaceholders(subject),
            ...extractPlaceholders(html),
            ...extractPlaceholders(text),
        ]);
        const missing = [...required]
            .filter(
                (name) =>
                    !Object.prototype.hasOwnProperty.call(variables, name),
            )
            .sort();
        if (missing.length > 0) {
            throw new NotMatchException(
                `Faltan variables de plantilla: ${missing.join(', ')}`,
            );
        }

        return {
            subject: renderPlaceholders(subject, variables, false),
            html:
                html === null
                    ? null
                    : renderPlaceholders(html, variables, true),
            text:
                text === null
                    ? null
                    : renderPlaceholders(text, variables, false),
            id_template: template.id_template,
            template_variables: JSON.stringify(variables),
        };
    };

    #stringify(variables: Record<string, unknown>): Record<string, string> {
        return Object.fromEntries(
            Object.entries(variables).map(([key, value]) => [
                key,
                value === null || value === undefined ? '' : String(value),
            ]),
        );
    }

    #subjectRequired(): ValidationException {
        return new ValidationException({
            subject: [
                'subject es requerido cuando no se usa una plantilla con asunto',
            ],
        });
    }
}
