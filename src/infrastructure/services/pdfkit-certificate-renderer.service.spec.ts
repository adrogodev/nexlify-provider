import {
    PdfkitCertificateRendererService,
    formatInZone,
} from './pdfkit-certificate-renderer.service';

describe('PdfkitCertificateRendererService', () => {
    it('renders a PDF document for the certificate evidence', async () => {
        const pdf = await new PdfkitCertificateRendererService().render({
            certificate_code: 'NXC-AbCdEf1234',
            issued_at: new Date('2026-11-05T15:00:00Z'),
            email_uuid: 'aaaaaaaa-1111-4111-8111-111111111111',
            short_code: 'NX-AAAAAA1',
            from_email: 'facturacion@empresa.co',
            to_email: 'juan.perez@cliente.com',
            subject: 'Factura electrónica FE-1001',
            message_id: '<abc@smtp.local>',
            content_hash: 'c'.repeat(64),
            evidence_hash: 'e'.repeat(64),
            attempts: Array.from({ length: 40 }, (_, index) => ({
                timestamp: '2026-11-01T10:00:05.000Z',
                level: 'SUCCESS',
                smtp_host: 'smtp.local',
                message: `Intento ${index}`,
            })),
            replies: [
                {
                    short_code: 'NX-REPLY01',
                    from_email: 'juan.perez@cliente.com',
                    received_at: '2026-11-02T08:00:00.000Z',
                    subject: 'RE: Factura',
                },
            ],
            verify_url:
                'https://api.nexlify.test/api/certificates/NXC-AbCdEf1234/verify',
        });

        expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
        expect(pdf.length).toBeGreaterThan(1000);
    });

    it('formats issue dates in UTC and America/Bogota', () => {
        const date = new Date('2026-11-05T15:04:05Z');

        expect(formatInZone(date, 'UTC')).toBe('2026-11-05 15:04:05');
        expect(formatInZone(date, 'America/Bogota')).toBe(
            '2026-11-05 10:04:05',
        );
    });
});
