import {
    escapeHtml,
    extractPlaceholders,
    renderPlaceholders,
} from './template-render.tool';

describe('template-render tool', () => {
    it('extracts unique placeholder names, allowing optional inner spaces', () => {
        expect(
            extractPlaceholders(
                'Hola {{nombre}}, factura {{ numero }} de {{nombre}}',
            ),
        ).toEqual(['nombre', 'numero']);
    });

    it('ignores text without placeholders and nullish input', () => {
        expect(extractPlaceholders('sin variables')).toEqual([]);
        expect(extractPlaceholders(null)).toEqual([]);
    });

    it('renders placeholders verbatim when escaping is off (subject / text)', () => {
        expect(
            renderPlaceholders(
                'Hola {{ nombre }} <b>',
                { nombre: 'Ana & <Co>' },
                false,
            ),
        ).toBe('Hola Ana & <Co> <b>');
    });

    it('HTML-escapes values when escaping is on (HTML body) without touching the template markup', () => {
        expect(
            renderPlaceholders(
                '<p>{{nombre}}</p>',
                { nombre: '<script>"x"&\'y\'</script>' },
                true,
            ),
        ).toBe(
            '<p>&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;</p>',
        );
    });

    it('leaves unknown placeholders untouched', () => {
        expect(renderPlaceholders('{{a}} {{b}}', { a: '1' }, false)).toBe(
            '1 {{b}}',
        );
    });

    it('escapes the five HTML special characters', () => {
        expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
    });
});
