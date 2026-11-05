import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type {
    CertificatePdfData,
    ICertificatePdfRenderer,
} from 'src/core/application/contracts/services/certificate-pdf.service';

const PRIMARY = '#1F3A5F';
const MUTED = '#5B6B7F';
const BORDER = '#C9D3DF';
const PAGE_MARGIN = 50;

/** `2026-11-05 14:03:22 UTC` style stamp in the given IANA zone. */
export function formatInZone(date: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(date);
    const get = (type: string) =>
        parts.find((part) => part.type === type)?.value ?? '';
    const hour = get('hour') === '24' ? '00' : get('hour');
    return `${get('year')}-${get('month')}-${get('day')} ${hour}:${get('minute')}:${get('second')}`;
}

/**
 * pdfkit adapter (S7): a single-flow A4 document in Spanish with the
 * certificate header, the email identity, both hashes, the chronological
 * attempt table, the reply chain and the public verification URL.
 */
@Injectable()
export class PdfkitCertificateRendererService
    implements ICertificatePdfRenderer
{
    public render = async (data: CertificatePdfData): Promise<Buffer> => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: PAGE_MARGIN,
            info: {
                Title: `Certificado de envío ${data.certificate_code}`,
                Author: 'Nexlify',
                Subject: 'Certificado de envío de correo electrónico',
            },
        });
        const chunks: Buffer[] = [];
        const done = new Promise<Buffer>((resolve, reject) => {
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
        });

        this.#header(doc, data);
        this.#section(doc, 'Datos del correo');
        this.#field(
            doc,
            'Identificador',
            `${data.short_code}  (${data.email_uuid})`,
        );
        this.#field(doc, 'Remitente', data.from_email);
        this.#field(doc, 'Destinatario(s)', data.to_email);
        this.#field(doc, 'Asunto', data.subject);
        this.#field(doc, 'Message-ID', data.message_id ?? 'No registrado');

        this.#section(doc, 'Integridad');
        this.#field(
            doc,
            'Hash del contenido (SHA-256)',
            data.content_hash,
            true,
        );
        this.#note(
            doc,
            'Calculado como SHA-256 de: asunto + "\\n" + cuerpo HTML + "\\n" + cuerpo de texto (campos vacíos como cadena vacía).',
        );
        this.#field(
            doc,
            'Hash de la evidencia (SHA-256)',
            data.evidence_hash,
            true,
        );
        this.#note(
            doc,
            'Calculado sobre el JSON canónico (claves ordenadas) de la evidencia almacenada.',
        );

        this.#section(doc, 'Intentos de entrega (orden cronológico)');
        this.#attemptsTable(doc, data);

        this.#section(doc, 'Cadena de respuestas');
        if (data.replies.length === 0) {
            this.#note(
                doc,
                'No se registraron respuestas a este correo al momento de la emisión.',
            );
        } else {
            for (const reply of data.replies) {
                this.#note(
                    doc,
                    `${reply.received_at ?? 'Sin fecha'} — ${reply.short_code} — de ${reply.from_email} — "${reply.subject}"`,
                );
            }
        }

        this.#section(doc, 'Verificación pública');
        this.#note(
            doc,
            'Cualquier tercero puede verificar la validez de este certificado en:',
        );
        doc.font('Helvetica-Bold')
            .fontSize(10)
            .fillColor(PRIMARY)
            .text(data.verify_url, { link: data.verify_url, underline: true });
        doc.moveDown(1.5);
        doc.font('Helvetica')
            .fontSize(8)
            .fillColor(MUTED)
            .text(
                'Este certificado fue emitido por la plataforma Nexlify y deja constancia de la evidencia técnica registrada sobre el envío. La alteración de cualquier dato invalida el hash de la evidencia.',
                { align: 'justify' },
            );

        doc.end();
        return await done;
    };

    #header(doc: PDFKit.PDFDocument, data: CertificatePdfData): void {
        doc.rect(0, 0, doc.page.width, 90).fill(PRIMARY);
        doc.fillColor('#FFFFFF')
            .font('Helvetica-Bold')
            .fontSize(20)
            .text('Nexlify', PAGE_MARGIN, 28);
        doc.font('Helvetica')
            .fontSize(10)
            .text('Plataforma de correo transaccional', PAGE_MARGIN, 54);
        doc.moveDown(3);
        doc.fillColor(PRIMARY)
            .font('Helvetica-Bold')
            .fontSize(16)
            .text(
                'Certificado de envío de correo electrónico',
                PAGE_MARGIN,
                110,
                { align: 'center' },
            );
        doc.moveDown(0.6);
        doc.font('Helvetica').fontSize(10).fillColor('#000000');
        doc.text(`Código del certificado: ${data.certificate_code}`, {
            align: 'center',
        });
        doc.text(
            `Fecha de emisión: ${formatInZone(data.issued_at, 'UTC')} UTC  |  ${formatInZone(data.issued_at, 'America/Bogota')} (America/Bogota)`,
            { align: 'center' },
        );
        doc.moveDown(0.5);
    }

    #section(doc: PDFKit.PDFDocument, title: string): void {
        this.#ensureSpace(doc, 60);
        doc.moveDown(0.8);
        doc.font('Helvetica-Bold')
            .fontSize(12)
            .fillColor(PRIMARY)
            .text(title, PAGE_MARGIN);
        const y = doc.y + 2;
        doc.moveTo(PAGE_MARGIN, y)
            .lineTo(doc.page.width - PAGE_MARGIN, y)
            .strokeColor(BORDER)
            .lineWidth(1)
            .stroke();
        doc.moveDown(0.5);
    }

    #field(
        doc: PDFKit.PDFDocument,
        label: string,
        value: string,
        monospace = false,
    ): void {
        doc.font('Helvetica-Bold')
            .fontSize(9)
            .fillColor(MUTED)
            .text(label, PAGE_MARGIN);
        doc.font(monospace ? 'Courier' : 'Helvetica')
            .fontSize(10)
            .fillColor('#000000')
            .text(value, PAGE_MARGIN);
        doc.moveDown(0.3);
    }

    #note(doc: PDFKit.PDFDocument, text: string): void {
        doc.font('Helvetica')
            .fontSize(9)
            .fillColor('#000000')
            .text(text, PAGE_MARGIN);
        doc.moveDown(0.2);
    }

    #attemptsTable(doc: PDFKit.PDFDocument, data: CertificatePdfData): void {
        const widths = [120, 60, 110, doc.page.width - PAGE_MARGIN * 2 - 290];
        const headers = ['Fecha (UTC)', 'Nivel', 'Servidor SMTP', 'Mensaje'];
        const drawRow = (cells: string[], bold: boolean) => {
            doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
            const heights = cells.map((cell, index) =>
                doc.heightOfString(cell, { width: widths[index] - 6 }),
            );
            const rowHeight = Math.max(...heights) + 6;
            this.#ensureSpace(doc, rowHeight + 4);
            const top = doc.y;
            let x = PAGE_MARGIN;
            if (bold) {
                doc.rect(
                    PAGE_MARGIN,
                    top,
                    widths.reduce((a, b) => a + b, 0),
                    rowHeight,
                ).fill('#EEF2F7');
            }
            doc.fillColor('#000000');
            cells.forEach((cell, index) => {
                doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
                    .fontSize(8)
                    .text(cell, x + 3, top + 3, { width: widths[index] - 6 });
                x += widths[index];
            });
            doc.moveTo(PAGE_MARGIN, top + rowHeight)
                .lineTo(x, top + rowHeight)
                .strokeColor(BORDER)
                .lineWidth(0.5)
                .stroke();
            doc.x = PAGE_MARGIN;
            doc.y = top + rowHeight;
        };

        drawRow(headers, true);
        if (data.attempts.length === 0) {
            drawRow(['—', '—', '—', 'Sin intentos registrados'], false);
            return;
        }
        for (const attempt of data.attempts) {
            drawRow(
                [
                    attempt.timestamp ?? '—',
                    attempt.level ?? '—',
                    attempt.smtp_host ?? '—',
                    attempt.message,
                ],
                false,
            );
        }
    }

    #ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
        if (doc.y + needed > doc.page.height - PAGE_MARGIN) {
            doc.addPage();
        }
    }
}
