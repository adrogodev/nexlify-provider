import { createHash } from 'node:crypto';
import { EmailStateEnum } from 'src/core/domain/enum';
import {
    NotFoundException,
    NotMatchException,
} from 'src/core/domain/exceptions';
import { HashGeneratorHelper } from 'src/infrastructure/helpers/hash-generator.helper';
import {
    canonicalJson,
    contentHashInput,
    maskRecipients,
} from './certificate-evidence';
import {
    GetCertificatePdfUseCase,
    GetCertificateUseCase,
} from './get-certificate.usecase';
import { IssueCertificateUseCase } from './issue-certificate.usecase';
import { VerifyCertificateUseCase } from './verify-certificate.usecase';

const sha256 = (text: string) =>
    createHash('sha256').update(text).digest('hex');

const sentEmail = (overrides: Record<string, unknown> = {}) => ({
    id_email: 9n,
    email_uuid: 'aaaaaaaa-1111-4111-8111-111111111111',
    short_code: 'NX-AAAAAA1',
    id_client: 70n,
    from_email: 'facturacion@empresa.co',
    to_email: 'juan.perez@cliente.com',
    subject: 'Factura FE-1001',
    body_html: '<p>Hola</p>',
    body_text: 'Hola',
    state: EmailStateEnum.SENT,
    attempts: 1,
    next_retry_at: null,
    sent_at: new Date('2026-11-01T10:00:05Z'),
    created_at: new Date('2026-11-01T10:00:00Z'),
    updated_at: null,
    message_id: '<abc@smtp.local>',
    direction: 'SENT',
    parent_email_id: null,
    ...overrides,
});

const logs = [
    {
        id_log: 2n,
        id_email: 9n,
        attempt: 1,
        level: 'SUCCESS',
        message: 'Enviado',
        smtp_host: 'smtp.local',
        created_at: new Date('2026-11-01T10:00:05Z'),
    },
    {
        id_log: 1n,
        id_email: 9n,
        attempt: 1,
        level: 'WARNING',
        message: 'Reintentando',
        smtp_host: 'smtp.local',
        created_at: new Date('2026-11-01T10:00:01Z'),
    },
];

const PUBLIC_URL = 'https://api.nexlify.test';

const buildIssue = (
    opts: {
        email?: unknown;
        existing?: unknown;
        isAdmin?: boolean;
        idUser?: number;
        createThrows?: boolean;
        raced?: unknown;
    } = {},
) => {
    const context = {
        get: jest.fn(() => ({
            id_user: opts.idUser ?? 70,
            is_admin: opts.isAdmin ?? false,
        })),
    };
    const emailsRepo = {
        findByUuidOrShortCode: jest.fn(async () =>
            opts.email === undefined ? sentEmail() : opts.email,
        ),
        findByParentId: jest.fn(async () => [
            {
                ...sentEmail({
                    id_email: 11n,
                    short_code: 'NX-REPLY01',
                    email_uuid: 'bbbbbbbb-1111-4111-8111-111111111111',
                    from_email: 'juan.perez@cliente.com',
                    subject: 'RE: Factura',
                    created_at: new Date('2026-11-02T08:00:00Z'),
                }),
            },
        ]),
    };
    const logsRepo = { findByEmail: jest.fn(async () => logs) };
    let findCalls = 0;
    const certificatesRepo = {
        findByEmailId: jest.fn(async () => {
            findCalls++;
            if (findCalls === 1) return opts.existing ?? null;
            return opts.raced ?? null;
        }),
        create: jest.fn(async (row: Record<string, unknown>) => {
            if (opts.createThrows) throw new Error('unique violation');
            return {
                ...row,
                id_certificate: 1n,
                certificate_uuid: 'cccccccc-1111-4111-8111-111111111111',
                created_at: new Date(),
            };
        }),
    };
    const idGen = {
        generateShortCode: jest.fn(() => 'NXC-AbCdEf1234'),
        generateUuid: jest.fn(),
    };
    const useCase = new IssueCertificateUseCase(
        context as never,
        emailsRepo as never,
        logsRepo as never,
        certificatesRepo as never,
        new HashGeneratorHelper(),
        idGen as never,
        { PUBLIC_API_URL: PUBLIC_URL } as never,
    );
    return { useCase, certificatesRepo, idGen };
};

describe('certificate evidence helpers', () => {
    it('canonical JSON sorts keys recursively so equal evidence hashes equally', () => {
        const a = canonicalJson({
            b: 1,
            a: { d: [{ y: 1, x: 2 }], c: 10n },
            z: new Date('2026-01-01T00:00:00Z'),
        });
        const b = canonicalJson({
            z: new Date('2026-01-01T00:00:00Z'),
            a: { c: 10n, d: [{ x: 2, y: 1 }] },
            b: 1,
        });

        expect(a).toBe(b);
        expect(a).toBe(
            '{"a":{"c":"10","d":[{"x":2,"y":1}]},"b":1,"z":"2026-01-01T00:00:00.000Z"}',
        );
    });

    it('content hash input is subject + \\n + body_html + \\n + body_text with empty nulls', () => {
        expect(
            contentHashInput({
                subject: 'S',
                body_html: '<p>h</p>',
                body_text: 't',
            }),
        ).toBe('S\n<p>h</p>\nt');
        expect(
            contentHashInput({
                subject: 'S',
                body_html: null,
                body_text: null,
            }),
        ).toBe('S\n\n');
    });

    it('masks every recipient', () => {
        expect(maskRecipients('juan.perez@cliente.com, ana@otra.co')).toBe(
            'j***@c***.com, a***@o***.co',
        );
    });
});

describe('IssueCertificateUseCase', () => {
    it('issues a certificate with reproducible content and evidence hashes', async () => {
        const { useCase, certificatesRepo, idGen } = buildIssue();

        const result = await useCase.run({ data: 'NX-AAAAAA1' });

        expect(idGen.generateShortCode).toHaveBeenCalledWith('NXC', 10);
        const row = certificatesRepo.create.mock.calls[0][0] as {
            evidence: string;
            evidence_hash: string;
            content_hash: string;
            issued_at: Date;
        };
        expect(row.content_hash).toBe(
            sha256('Factura FE-1001\n<p>Hola</p>\nHola'),
        );
        expect(row.evidence_hash).toBe(sha256(row.evidence));
        expect(row.evidence).toBe(canonicalJson(JSON.parse(row.evidence)));

        const evidence = JSON.parse(row.evidence);
        expect(evidence.issued_at).toBe(row.issued_at.toISOString());
        expect(evidence.email.message_id).toBe('<abc@smtp.local>');
        expect(
            evidence.attempts.map((a: { message: string }) => a.message),
        ).toEqual(['Reintentando', 'Enviado']);
        expect(evidence.attempts[0].smtp_host).toBe('smtp.local');
        expect(evidence.replies).toEqual([
            expect.objectContaining({
                short_code: 'NX-REPLY01',
                from_email: 'juan.perez@cliente.com',
                received_at: '2026-11-02T08:00:00.000Z',
            }),
        ]);
        expect(row.evidence).not.toContain('<p>Hola</p>');

        expect(result).toEqual({
            certificate_uuid: 'cccccccc-1111-4111-8111-111111111111',
            certificate_code: 'NXC-AbCdEf1234',
            issued_at: row.issued_at,
            content_hash: row.content_hash,
            evidence_hash: row.evidence_hash,
            verify_url: `${PUBLIC_URL}/api/certificates/NXC-AbCdEf1234/verify`,
        });
    });

    it('is idempotent: an already certified email returns the stored certificate', async () => {
        const existing = {
            id_certificate: 1n,
            certificate_uuid: 'dddddddd-1111-4111-8111-111111111111',
            certificate_code: 'NXC-EXISTING01',
            id_email: 9n,
            content_hash: 'c',
            evidence_hash: 'e',
            evidence: '{}',
            issued_at: new Date('2026-11-01T00:00:00Z'),
            created_at: null,
        };
        const { useCase, certificatesRepo } = buildIssue({ existing });

        const result = await useCase.run({ data: 'NX-AAAAAA1' });

        expect(certificatesRepo.create).not.toHaveBeenCalled();
        expect(result.certificate_code).toBe('NXC-EXISTING01');
    });

    it.each([
        EmailStateEnum.FAILED,
        EmailStateEnum.QUEUED,
        EmailStateEnum.RECEIVED,
    ])('rejects an email in state %s with 400', async (state) => {
        const { useCase, certificatesRepo } = buildIssue({
            email: sentEmail({ state }),
        });

        await expect(
            useCase.run({ data: 'NX-AAAAAA1' }),
        ).rejects.toBeInstanceOf(NotMatchException);
        expect(certificatesRepo.create).not.toHaveBeenCalled();
    });

    it('certifies WARNING emails', async () => {
        const { useCase, certificatesRepo } = buildIssue({
            email: sentEmail({ state: EmailStateEnum.WARNING }),
        });

        await useCase.run({ data: 'NX-AAAAAA1' });

        expect(certificatesRepo.create).toHaveBeenCalledTimes(1);
    });

    it('hides other clients emails behind a 404', async () => {
        const { useCase } = buildIssue({ idUser: 71 });

        await expect(
            useCase.run({ data: 'NX-AAAAAA1' }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the concurrently issued certificate when the insert loses the race', async () => {
        const raced = {
            certificate_uuid: 'u',
            certificate_code: 'NXC-RACED00001',
            issued_at: new Date(),
            content_hash: 'c',
            evidence_hash: 'e',
        };
        const { useCase } = buildIssue({ createThrows: true, raced });

        await expect(
            useCase.run({ data: 'NX-AAAAAA1' }),
        ).resolves.toMatchObject({ certificate_code: 'NXC-RACED00001' });
    });
});

describe('GetCertificateUseCase / GetCertificatePdfUseCase', () => {
    const evidence = canonicalJson({
        version: 1,
        platform: 'Nexlify',
        certificate_code: 'NXC-AbCdEf1234',
        issued_at: '2026-11-03T00:00:00.000Z',
        content_hash: 'c'.repeat(64),
        email: {
            email_uuid: 'aaaaaaaa-1111-4111-8111-111111111111',
            short_code: 'NX-AAAAAA1',
            id_client: '70',
            from_email: 'facturacion@empresa.co',
            to_email: 'juan.perez@cliente.com',
            subject: 'Factura FE-1001',
            message_id: '<abc@smtp.local>',
            state: 'SENT',
            attempts: 1,
            created_at: null,
            sent_at: '2026-11-01T10:00:05.000Z',
        },
        attempts: [
            {
                attempt: 1,
                level: 'SUCCESS',
                smtp_host: 'smtp.local',
                message: 'Enviado',
                created_at: '2026-11-01T10:00:05.000Z',
            },
        ],
        replies: [],
    });
    const certificate = {
        id_certificate: 1n,
        certificate_uuid: 'cccccccc-1111-4111-8111-111111111111',
        certificate_code: 'NXC-AbCdEf1234',
        id_email: 9n,
        content_hash: 'c'.repeat(64),
        evidence_hash: sha256(evidence),
        evidence,
        issued_at: new Date('2026-11-03T00:00:00Z'),
        created_at: null,
    };
    const context = { get: () => ({ id_user: 70, is_admin: false }) };
    const emailsRepo = {
        findByUuidOrShortCode: jest.fn(async () => sentEmail()),
    };

    it('returns 404 when the email has no certificate', async () => {
        const useCase = new GetCertificateUseCase(
            context as never,
            emailsRepo as never,
            { findByEmailId: async () => null } as never,
            { PUBLIC_API_URL: PUBLIC_URL } as never,
        );

        await expect(
            useCase.run({ data: 'NX-AAAAAA1' }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('renders the PDF from the stored evidence with the public verification URL', async () => {
        const renderer = {
            render: jest.fn(async () => Buffer.from('%PDF-1.3')),
        };
        const useCase = new GetCertificatePdfUseCase(
            context as never,
            emailsRepo as never,
            { findByEmailId: async () => certificate } as never,
            renderer,
            { PUBLIC_API_URL: PUBLIC_URL } as never,
        );

        const pdf = await useCase.run({ data: 'NX-AAAAAA1' });

        expect(pdf.filename).toBe('certificado-NXC-AbCdEf1234.pdf');
        expect(pdf.content.toString()).toBe('%PDF-1.3');
        expect(renderer.render).toHaveBeenCalledWith(
            expect.objectContaining({
                certificate_code: 'NXC-AbCdEf1234',
                message_id: '<abc@smtp.local>',
                evidence_hash: certificate.evidence_hash,
                attempts: [
                    {
                        timestamp: '2026-11-01T10:00:05.000Z',
                        level: 'SUCCESS',
                        smtp_host: 'smtp.local',
                        message: 'Enviado',
                    },
                ],
                verify_url: `${PUBLIC_URL}/api/certificates/NXC-AbCdEf1234/verify`,
            }),
        );
    });

    describe('VerifyCertificateUseCase', () => {
        const build = (cert: unknown) =>
            new VerifyCertificateUseCase(
                { findByCode: jest.fn(async () => cert) } as never,
                {
                    getByIdAsync: jest.fn(async () =>
                        sentEmail({ state: 'BOUNCED' }),
                    ),
                } as never,
                new HashGeneratorHelper(),
            );

        it('is valid when the stored evidence still hashes to evidence_hash and exposes no body', async () => {
            const result = await build(certificate).run({
                data: 'NXC-AbCdEf1234',
            });

            expect(result.valid).toBe(true);
            expect(result.evidence_hash).toBe(certificate.evidence_hash);
            expect(result.email).toEqual({
                short_code: 'NX-AAAAAA1',
                subject: 'Factura FE-1001',
                to_email: 'j***@c***.com',
                sent_at: '2026-11-01T10:00:05.000Z',
                state: 'BOUNCED',
            });
            expect(JSON.stringify(result)).not.toContain('Hola');
        });

        it('is invalid when the stored evidence was tampered with', async () => {
            const tampered = {
                ...certificate,
                evidence: certificate.evidence.replace('Enviado', 'Entregado'),
            };

            expect(
                (await build(tampered).run({ data: 'NXC-AbCdEf1234' })).valid,
            ).toBe(false);
        });

        it('returns 404 for an unknown code', async () => {
            await expect(
                build(null).run({ data: 'NXC-UNKNOWN000' }),
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
