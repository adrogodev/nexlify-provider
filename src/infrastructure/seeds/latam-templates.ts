/**
 * LatAm Spanish (neutral) email templates seeded by `pnpm db:seed:templates`
 * (S3). Every `{{placeholder}}` used in subject/body is declared in
 * `variables`; values are HTML-escaped when rendered into the body.
 */
export interface SeedTemplate {
    name: string;
    category: string;
    locale: string;
    subject: string;
    variables: string[];
    template: string;
}

const layout = (title: string, content: string): string => `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#1f2330;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;">
<tr><td style="padding:24px 32px;border-bottom:1px solid #e6e6ea;font-size:20px;font-weight:bold;">${title}</td></tr>
<tr><td style="padding:24px 32px;font-size:15px;line-height:1.6;">${content}</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #e6e6ea;font-size:12px;color:#6b7080;">Este es un mensaje automatico de {{empresa}}. Por favor no respondas directamente si no se indica lo contrario.</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const button = (href: string, label: string): string =>
    `<p style="margin:24px 0;"><a href="${href}" style="background:#5b3cc4;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block;">${label}</a></p>`;

export const LATAM_TEMPLATES: SeedTemplate[] = [
    {
        name: 'factura_electronica_emitida',
        category: 'facturacion',
        locale: 'es',
        subject: 'Factura electronica {{numero_factura}} de {{empresa}}',
        variables: [
            'empresa',
            'nombre_cliente',
            'numero_factura',
            'fecha_emision',
            'monto_total',
            'moneda',
            'fecha_vencimiento',
            'enlace_factura',
        ],
        template: layout(
            'Factura electronica emitida',
            `<p>Estimado(a) {{nombre_cliente}}:</p>
<p>Le informamos que {{empresa}} ha emitido la factura electronica <strong>{{numero_factura}}</strong> con fecha {{fecha_emision}}.</p>
<table role="presentation" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
<tr><td style="color:#6b7080;">Valor total</td><td><strong>{{moneda}} {{monto_total}}</strong></td></tr>
<tr><td style="color:#6b7080;">Fecha de vencimiento</td><td>{{fecha_vencimiento}}</td></tr>
</table>
${button('{{enlace_factura}}', 'Ver factura')}
<p>El documento electronico (XML y representacion grafica) se encuentra disponible en el enlace anterior para su consulta y descarga.</p>
<p>Cordialmente,<br>{{empresa}}</p>`,
        ),
    },
    {
        name: 'recordatorio_pago',
        category: 'cobranza',
        locale: 'es',
        subject:
            'Recordatorio: su factura {{numero_factura}} vence el {{fecha_vencimiento}}',
        variables: [
            'empresa',
            'nombre_cliente',
            'numero_factura',
            'monto_total',
            'moneda',
            'fecha_vencimiento',
            'enlace_pago',
        ],
        template: layout(
            'Recordatorio de pago',
            `<p>Estimado(a) {{nombre_cliente}}:</p>
<p>Le recordamos amablemente que la factura <strong>{{numero_factura}}</strong> por valor de <strong>{{moneda}} {{monto_total}}</strong> vence el <strong>{{fecha_vencimiento}}</strong>.</p>
<p>Para evitar inconvenientes, le invitamos a realizar el pago antes de la fecha indicada.</p>
${button('{{enlace_pago}}', 'Pagar ahora')}
<p>Si ya realizo el pago, por favor haga caso omiso de este mensaje.</p>
<p>Cordialmente,<br>{{empresa}}</p>`,
        ),
    },
    {
        name: 'aviso_cobro_vencido',
        category: 'cobranza',
        locale: 'es',
        subject: 'Aviso de cobro: factura {{numero_factura}} vencida',
        variables: [
            'empresa',
            'nombre_cliente',
            'numero_factura',
            'monto_total',
            'moneda',
            'dias_vencida',
            'fecha_limite',
            'enlace_pago',
            'telefono_contacto',
        ],
        template: layout(
            'Aviso de obligacion vencida',
            `<p>Estimado(a) {{nombre_cliente}}:</p>
<p>A la fecha, nuestros registros indican que la factura <strong>{{numero_factura}}</strong> por valor de <strong>{{moneda}} {{monto_total}}</strong> presenta <strong>{{dias_vencida}} dias de vencimiento</strong>.</p>
<p>Le solicitamos regularizar su obligacion a mas tardar el <strong>{{fecha_limite}}</strong> para evitar el inicio de gestiones adicionales de cobro.</p>
${button('{{enlace_pago}}', 'Regularizar pago')}
<p>Si desea acordar una alternativa de pago, comuniquese con nosotros al {{telefono_contacto}}.</p>
<p>Atentamente,<br>Area de Cartera - {{empresa}}</p>`,
        ),
    },
    {
        name: 'notificacion_legal',
        category: 'legal',
        locale: 'es',
        subject: 'Notificacion {{referencia}}: {{asunto_notificacion}}',
        variables: [
            'empresa',
            'nombre_destinatario',
            'referencia',
            'asunto_notificacion',
            'fecha_notificacion',
            'contenido_notificacion',
            'plazo_respuesta',
            'correo_respuesta',
        ],
        template: layout(
            'Notificacion formal',
            `<p>Senor(a) {{nombre_destinatario}}:</p>
<p>Por medio de la presente, {{empresa}} le notifica formalmente lo siguiente:</p>
<table role="presentation" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
<tr><td style="color:#6b7080;">Referencia</td><td><strong>{{referencia}}</strong></td></tr>
<tr><td style="color:#6b7080;">Asunto</td><td>{{asunto_notificacion}}</td></tr>
<tr><td style="color:#6b7080;">Fecha</td><td>{{fecha_notificacion}}</td></tr>
</table>
<p>{{contenido_notificacion}}</p>
<p>Dispone de un plazo de <strong>{{plazo_respuesta}}</strong> para pronunciarse al respecto, enviando su respuesta a {{correo_respuesta}}.</p>
<p>La presente comunicacion se remite por medio electronico y constituye constancia de su envio.</p>
<p>Atentamente,<br>{{empresa}}</p>`,
        ),
    },
    {
        name: 'bienvenida',
        category: 'onboarding',
        locale: 'es',
        subject: 'Bienvenido(a) a {{empresa}}, {{nombre}}',
        variables: ['empresa', 'nombre', 'enlace_acceso', 'correo_soporte'],
        template: layout(
            'Te damos la bienvenida',
            `<p>Hola {{nombre}}:</p>
<p>Gracias por unirte a {{empresa}}. Tu cuenta ya esta lista para que comiences a usar nuestros servicios.</p>
${button('{{enlace_acceso}}', 'Ingresar a mi cuenta')}
<p>Si tienes alguna pregunta, escribenos a {{correo_soporte}} y con gusto te ayudaremos.</p>
<p>Saludos,<br>El equipo de {{empresa}}</p>`,
        ),
    },
    {
        name: 'recuperacion_contrasena',
        category: 'seguridad',
        locale: 'es',
        subject: 'Restablece tu contrasena de {{empresa}}',
        variables: [
            'empresa',
            'nombre',
            'enlace_recuperacion',
            'minutos_validez',
        ],
        template: layout(
            'Recuperacion de contrasena',
            `<p>Hola {{nombre}}:</p>
<p>Recibimos una solicitud para restablecer la contrasena de tu cuenta en {{empresa}}.</p>
${button('{{enlace_recuperacion}}', 'Restablecer contrasena')}
<p>Este enlace es valido por {{minutos_validez}} minutos y solo puede usarse una vez.</p>
<p>Si no solicitaste este cambio, ignora este mensaje: tu contrasena actual seguira siendo valida.</p>
<p>Saludos,<br>El equipo de {{empresa}}</p>`,
        ),
    },
];
