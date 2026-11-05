import { extractPlaceholders } from 'src/core/application/tools/template-render.tool';
import { LATAM_TEMPLATES } from './latam-templates';

describe('LATAM_TEMPLATES seed data (S3)', () => {
    it('covers invoice, reminder, collections, legal, welcome and password recovery', () => {
        expect(LATAM_TEMPLATES.map((t) => t.name)).toEqual([
            'factura_electronica_emitida',
            'recordatorio_pago',
            'aviso_cobro_vencido',
            'notificacion_legal',
            'bienvenida',
            'recuperacion_contrasena',
        ]);
    });

    it.each(LATAM_TEMPLATES.map((t) => [t.name, t]))(
        '%s declares exactly the placeholders it uses and fits the columns',
        (_name, template) => {
            const used = new Set([
                ...extractPlaceholders(template.subject),
                ...extractPlaceholders(template.template),
            ]);

            expect([...used].sort()).toEqual([...template.variables].sort());
            expect(template.locale).toBe('es');
            expect(template.name.length).toBeLessThanOrEqual(50);
            expect(template.category.length).toBeLessThanOrEqual(50);
            expect(template.subject.length).toBeLessThanOrEqual(255);
        },
    );

    it('has unique names (the upsert key)', () => {
        expect(new Set(LATAM_TEMPLATES.map((t) => t.name)).size).toBe(
            LATAM_TEMPLATES.length,
        );
    });
});
