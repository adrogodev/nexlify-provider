/**
 * `{{name}}` / `{{ name }}` placeholders (S2). Names are word characters,
 * dots and dashes; anything else is left as literal text.
 */
const PLACEHOLDER = /\{\{\s*([\w.-]+)\s*\}\}/g;

const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

export const escapeHtml = (value: string): string =>
    value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

/** Unique placeholder names in order of first appearance. */
export const extractPlaceholders = (
    text: Nullable<string> | undefined,
): string[] => {
    if (!text) return [];
    const names = new Set<string>();
    for (const match of text.matchAll(PLACEHOLDER)) {
        names.add(match[1]);
    }
    return [...names];
};

/**
 * Replaces every known placeholder with its value; unknown placeholders stay
 * untouched. `escapeValues` HTML-escapes the values (HTML bodies only).
 */
export const renderPlaceholders = (
    text: string,
    variables: Record<string, string>,
    escapeValues: boolean,
): string =>
    text.replace(PLACEHOLDER, (whole, name: string) => {
        if (!Object.prototype.hasOwnProperty.call(variables, name))
            return whole;
        const value = String(variables[name] ?? '');
        return escapeValues ? escapeHtml(value) : value;
    });
