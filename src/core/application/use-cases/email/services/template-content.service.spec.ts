import {
    NotFoundException,
    NotMatchException,
    ValidationException,
} from 'src/core/domain/exceptions';
import { TemplateContentService } from './template-content.service';

describe('TemplateContentService', () => {
    const template = {
        id_template: '11111111-1111-4111-8111-111111111111',
        name: 'factura',
        subject: 'Factura {{numero}} de {{ empresa }}',
        template: '<p>Hola {{nombre}}, adjuntamos la factura {{numero}}.</p>',
        is_active: true,
        created_at: null,
        updated_at: null,
    };

    const build = (stored: unknown = template) => {
        const templatesRepo = { getByIdAsync: jest.fn(async () => stored) };
        return {
            service: new TemplateContentService(templatesRepo as never),
            templatesRepo,
        };
    };

    it('keeps explicit content untouched when no template is given (existing behaviour)', async () => {
        const { service, templatesRepo } = build();

        const result = await service.resolve({
            subject: 'Hola {{x}}',
            html: '<b>{{x}}</b>',
            text: 'plain',
        });

        expect(result).toEqual({
            subject: 'Hola {{x}}',
            html: '<b>{{x}}</b>',
            text: 'plain',
            id_template: null,
            template_variables: null,
        });
        expect(templatesRepo.getByIdAsync).not.toHaveBeenCalled();
    });

    it('renders subject and HTML body from the template, escaping only the HTML body', async () => {
        const { service } = build();

        const result = await service.resolve({
            id_template: template.id_template,
            variables: {
                numero: 'F-001',
                empresa: 'A&B <SAS>',
                nombre: '<Ana>',
            },
        });

        expect(result.subject).toBe('Factura F-001 de A&B <SAS>');
        expect(result.html).toBe(
            '<p>Hola &lt;Ana&gt;, adjuntamos la factura F-001.</p>',
        );
        expect(result.text).toBeNull();
        expect(result.id_template).toBe(template.id_template);
        expect(JSON.parse(result.template_variables as string)).toEqual({
            numero: 'F-001',
            empresa: 'A&B <SAS>',
            nombre: '<Ana>',
        });
    });

    it('lets explicit subject/html/text override the template and still renders their placeholders', async () => {
        const { service } = build();

        const result = await service.resolve({
            id_template: template.id_template,
            variables: { numero: '9', nombre: 'Ana' },
            subject: 'Asunto propio {{numero}}',
            text: 'Hola {{nombre}}',
        });

        expect(result.subject).toBe('Asunto propio 9');
        expect(result.html).toBe('<p>Hola Ana, adjuntamos la factura 9.</p>');
        expect(result.text).toBe('Hola Ana');
    });

    it('rejects with 400 listing every missing variable', async () => {
        const { service } = build();

        const run = service.resolve({
            id_template: template.id_template,
            variables: { numero: '1' },
        });

        await expect(run).rejects.toBeInstanceOf(NotMatchException);
        await expect(
            service.resolve({
                id_template: template.id_template,
                variables: { numero: '1' },
            }),
        ).rejects.toThrow('Faltan variables de plantilla: empresa, nombre');
    });

    it('fails with not found for an unknown or inactive template', async () => {
        await expect(
            build(null).service.resolve({ id_template: template.id_template }),
        ).rejects.toBeInstanceOf(NotFoundException);
        await expect(
            build({ ...template, is_active: false }).service.resolve({
                id_template: template.id_template,
            }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('requires a subject when neither the request nor the template provide one', async () => {
        await expect(
            build().service.resolve({ text: 'x' } as never),
        ).rejects.toBeInstanceOf(ValidationException);
        await expect(
            build({ ...template, subject: null }).service.resolve({
                id_template: template.id_template,
                variables: { numero: '1', nombre: 'a' },
            }),
        ).rejects.toBeInstanceOf(ValidationException);
    });
});
