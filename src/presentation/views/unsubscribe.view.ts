import { escapeHtml } from 'src/core/application/tools/template-render.tool';

/**
 * Self-contained HTML pages of the public unsubscribe flow (S5). No scripts,
 * no external assets: only inline styles, so a strict CSP
 * (`default-src 'none'; style-src 'unsafe-inline'; form-action 'self'`) holds.
 */
export const UNSUBSCRIBE_PAGE_CSP =
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";

const layout = (title: string, body: string): string => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#f4f4f7;color:#1f2330}
main{max-width:480px;margin:10vh auto;padding:32px;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
h1{font-size:1.4rem;margin:0 0 12px}
p{line-height:1.5}
button{margin-top:16px;padding:12px 20px;border:0;border-radius:8px;background:#5b3cc4;color:#fff;font-size:1rem;cursor:pointer}
.muted{color:#6b7080;font-size:.9rem}
</style>
</head>
<body><main>${body}</main></body>
</html>`;

export const renderUnsubscribeConfirmPage = (email: string): string =>
    layout(
        'Cancelar suscripcion',
        `<h1>Cancelar suscripcion</h1>
<p>Vas a dejar de recibir correos en <strong>${escapeHtml(email)}</strong>.</p>
<form method="post">
<input type="hidden" name="List-Unsubscribe" value="One-Click">
<button type="submit">Confirmar cancelacion</button>
</form>
<p class="muted">Si no solicitaste esto, simplemente cierra esta pagina.</p>`,
    );

export const renderUnsubscribeDonePage = (email: string): string =>
    layout(
        'Suscripcion cancelada',
        `<h1>Suscripcion cancelada</h1>
<p>La direccion <strong>${escapeHtml(email)}</strong> no volvera a recibir correos de este remitente.</p>`,
    );

export const renderUnsubscribeInvalidPage = (): string =>
    layout(
        'Enlace invalido',
        `<h1>Enlace invalido</h1>
<p>El enlace de cancelacion no es valido o fue modificado.</p>`,
    );
