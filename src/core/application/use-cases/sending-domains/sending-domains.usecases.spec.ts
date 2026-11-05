import 'reflect-metadata';
import {
    ActionNotAllowedException,
    AlreadyExistsException,
    NotFoundException,
} from 'src/core/domain/exceptions';
import { DeleteSendingDomainUseCase } from './delete-sending-domain';
import { ListSendingDomainsUseCase } from './list-sending-domains';
import { RegisterSendingDomainUseCase } from './register-sending-domain';
import { SpfPolicyService } from './spf-policy.service';
import { VerifySendingDomainUseCase } from './verify-sending-domain';

describe('Sending domains use cases (S4)', () => {
    const stored: Array<Record<string, any>> = [];

    const domainsRepo = {
        create: jest.fn(async (data: any) => {
            const row = {
                id_domain: BigInt(stored.length + 1),
                domain_uuid: `00000000-0000-4000-8000-00000000000${stored.length + 1}`,
                spf_verified: false,
                dkim_verified: false,
                dmarc_verified: false,
                last_checked_at: null,
                created_at: new Date('2026-11-05T00:00:00Z'),
                updated_at: null,
                ...data,
            };
            stored.push(row);
            return row;
        }),
        findByDomain: jest.fn(
            async (domain: string) =>
                stored.find((d) => d.domain === domain.toLowerCase()) ?? null,
        ),
        findByUuid: jest.fn(
            async (uuid: string) =>
                stored.find((d) => d.domain_uuid === uuid) ?? null,
        ),
        findAllByClient: jest.fn(async (idClient?: bigint) =>
            stored.filter(
                (d) => idClient === undefined || d.id_client === idClient,
            ),
        ),
        update: jest.fn(async (id: bigint, patch: any) => {
            const row = stored.find((d) => d.id_domain === id);
            Object.assign(row as object, patch);
            return row;
        }),
        delete: jest.fn(async (id: bigint) => {
            const index = stored.findIndex((d) => d.id_domain === id);
            if (index >= 0) stored.splice(index, 1);
            return index >= 0;
        }),
    };

    const spf = new SpfPolicyService(
        {
            findConfiguration: jest.fn(async () => ({ id_smtp_server: 5n })),
        } as never,
        {
            getByIdAsync: jest.fn(async () => ({ host: 'smtp.mailhost.test' })),
        } as never,
    );
    const keyGen = {
        generate: jest.fn(() => ({
            publicKey: 'PUBKEYBASE64',
            privateKeyPem: '-----BEGIN PRIVATE KEY-----x',
        })),
    };
    const encrypter = {
        encrypt: jest.fn(
            (value: string, key: string) => `enc(${value},${key})`,
        ),
    };
    const appConfig = { ENCRYPT_KEY: 'k' };
    const contextFor = (auth: unknown) =>
        ({ get: jest.fn(() => auth) }) as never;
    const client7 = contextFor({ id_user: 7, is_admin: false });
    const admin = contextFor({ id_user: 1, is_admin: true });

    const register = (context = client7) =>
        new RegisterSendingDomainUseCase(
            context,
            domainsRepo as never,
            keyGen as never,
            encrypter as never,
            appConfig as never,
            spf,
        );

    beforeEach(() => {
        stored.length = 0;
        jest.clearAllMocks();
    });

    describe('RegisterSendingDomainUseCase', () => {
        it('generates a DKIM keypair, encrypts the private key and returns the DNS records to publish', async () => {
            const result = await register().run({
                data: { domain: 'Acme.CO' },
            } as never);

            const created = domainsRepo.create.mock.calls[0][0];
            expect(created).toEqual({
                id_client: 7n,
                domain: 'acme.co',
                dkim_selector: 'nexlify',
                dkim_public_key: 'PUBKEYBASE64',
                dkim_private_key: 'enc(-----BEGIN PRIVATE KEY-----x,k)',
            });
            expect(result).not.toHaveProperty('dkim_private_key');
            expect(result).not.toHaveProperty('dkim_public_key');
            expect(result.domain).toBe('acme.co');
            expect(result.id_client).toBe(7);
            expect(result.dns_records).toEqual([
                {
                    type: 'TXT',
                    host: 'acme.co',
                    value: 'v=spf1 a:smtp.mailhost.test ~all',
                    purpose: 'SPF',
                    verified: false,
                },
                {
                    type: 'TXT',
                    host: 'nexlify._domainkey.acme.co',
                    value: 'v=DKIM1; k=rsa; p=PUBKEYBASE64',
                    purpose: 'DKIM',
                    verified: false,
                },
                {
                    type: 'TXT',
                    host: '_dmarc.acme.co',
                    value: 'v=DMARC1; p=none; rua=mailto:dmarc@acme.co',
                    purpose: 'DMARC',
                    verified: false,
                },
            ]);
        });

        it('rejects a domain that is already registered', async () => {
            await register().run({ data: { domain: 'acme.co' } } as never);
            await expect(
                register().run({ data: { domain: 'ACME.co' } } as never),
            ).rejects.toBeInstanceOf(AlreadyExistsException);
        });

        it('lets only an admin register for another client', async () => {
            await expect(
                register().run({
                    data: { domain: 'x.co', id_client: 9 },
                } as never),
            ).rejects.toBeInstanceOf(ActionNotAllowedException);
            const result = await register(admin).run({
                data: { domain: 'x.co', id_client: 9 },
            } as never);
            expect(result.id_client).toBe(9);
        });

        it('registers a platform-wide domain for an admin without id_client', async () => {
            const result = await register(admin).run({
                data: { domain: 'nexlify.co' },
            } as never);
            expect(result.id_client).toBeNull();
        });
    });

    describe('ListSendingDomainsUseCase', () => {
        it('lists only own domains for a client and every domain for an admin', async () => {
            await register().run({ data: { domain: 'a.co' } } as never);
            await register(admin).run({
                data: { domain: 'b.co', id_client: 9 },
            } as never);

            const own = await new ListSendingDomainsUseCase(
                client7,
                domainsRepo as never,
                spf,
            ).run({ data: null });
            const all = await new ListSendingDomainsUseCase(
                admin,
                domainsRepo as never,
                spf,
            ).run({ data: null });

            expect(own.map((d) => d.domain)).toEqual(['a.co']);
            expect(all.map((d) => d.domain)).toEqual(['a.co', 'b.co']);
        });
    });

    describe('VerifySendingDomainUseCase', () => {
        const dnsWith = (records: Record<string, string[]>) => ({
            resolveTxt: jest.fn(async (host: string) => records[host] ?? []),
        });

        it('resolves SPF, DKIM and DMARC and stores the flags + last_checked_at', async () => {
            const created = await register().run({
                data: { domain: 'acme.co' },
            } as never);
            const dns = dnsWith({
                'acme.co': [
                    'google-site-verification=x',
                    'v=spf1 include:_spf.other.test a:SMTP.mailhost.test ~all',
                ],
                'nexlify._domainkey.acme.co': [
                    'v=DKIM1; k=rsa; p=PUBKEY BASE64',
                ],
                '_dmarc.acme.co': ['v=DMARC1; p=quarantine'],
            });

            const result = await new VerifySendingDomainUseCase(
                client7,
                domainsRepo as never,
                dns as never,
                spf,
            ).run({ data: created.domain_uuid });

            expect(domainsRepo.update).toHaveBeenCalledWith(
                1n,
                expect.objectContaining({
                    spf_verified: true,
                    dkim_verified: true,
                    dmarc_verified: true,
                    last_checked_at: expect.any(Date),
                }),
            );
            expect(result.dkim_verified).toBe(true);
            expect(result.dns_records.every((r) => r.verified)).toBe(true);
        });

        it('keeps flags false when records are missing or the DKIM key differs', async () => {
            const created = await register().run({
                data: { domain: 'acme.co' },
            } as never);
            const dns = dnsWith({
                'nexlify._domainkey.acme.co': ['v=DKIM1; k=rsa; p=OTHERKEY'],
                'acme.co': ['v=spf1 mx ~all'],
            });

            const result = await new VerifySendingDomainUseCase(
                client7,
                domainsRepo as never,
                dns as never,
                spf,
            ).run({ data: created.domain_uuid });

            expect(result.spf_verified).toBe(false);
            expect(result.dkim_verified).toBe(false);
            expect(result.dmarc_verified).toBe(false);
            expect(result.last_checked_at).toBeInstanceOf(Date);
        });

        it('hides another client domain as not found', async () => {
            const created = await register(admin).run({
                data: { domain: 'b.co', id_client: 9 },
            } as never);
            await expect(
                new VerifySendingDomainUseCase(
                    client7,
                    domainsRepo as never,
                    dnsWith({}) as never,
                    spf,
                ).run({ data: created.domain_uuid }),
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('DeleteSendingDomainUseCase', () => {
        it('deletes an own domain and returns { deleted: true }', async () => {
            const created = await register().run({
                data: { domain: 'acme.co' },
            } as never);

            await expect(
                new DeleteSendingDomainUseCase(
                    client7,
                    domainsRepo as never,
                ).run({ data: created.domain_uuid }),
            ).resolves.toEqual({ deleted: true });
            expect(stored).toHaveLength(0);
        });

        it('refuses to delete another client domain', async () => {
            const created = await register(admin).run({
                data: { domain: 'b.co', id_client: 9 },
            } as never);

            await expect(
                new DeleteSendingDomainUseCase(
                    client7,
                    domainsRepo as never,
                ).run({ data: created.domain_uuid }),
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(domainsRepo.delete).not.toHaveBeenCalled();
        });
    });

    describe('SpfPolicyService', () => {
        it('uses ip4 for an IP SMTP host and mx without any SMTP server', async () => {
            const ip = new SpfPolicyService(
                {
                    findConfiguration: jest.fn(async () => ({
                        id_smtp_server: 5n,
                    })),
                } as never,
                {
                    getByIdAsync: jest.fn(async () => ({ host: '10.0.0.5' })),
                } as never,
            );
            const none = new SpfPolicyService(
                { findConfiguration: jest.fn(async () => null) } as never,
                { getByIdAsync: jest.fn() } as never,
            );

            await expect(ip.mechanism()).resolves.toBe('ip4:10.0.0.5');
            await expect(none.mechanism()).resolves.toBe('mx');
        });
    });
});
