import { SuppressionReasonEnum } from 'src/core/domain/enum';
import { DeliverabilityService } from './deliverability.service';

describe('DeliverabilityService', () => {
    const email = {
        id_email: 100n,
        id_client: 7n,
        from_email: 'facturas@Acme.co',
        to_email: 'dest@test.local',
    };

    const verifiedDomain = {
        domain: 'acme.co',
        dkim_selector: 'nexlify',
        dkim_private_key: 'encrypted-pem',
        dkim_verified: true,
    };

    const build = (
        opts: {
            domain?: unknown;
            blocking?: unknown;
            decryptThrows?: boolean;
        } = {},
    ) => {
        const suppressionService = {
            findBlocking: jest.fn(async () => opts.blocking ?? null),
        };
        const domainsRepo = {
            findByDomain: jest.fn(async () =>
                opts.domain === undefined ? verifiedDomain : opts.domain,
            ),
        };
        const encrypter = {
            decrypt: jest.fn((value: string, key: string) => {
                if (opts.decryptThrows) throw new Error('bad key');
                return `PEM(${value},${key})`;
            }),
        };
        const appConfig = { ENCRYPT_KEY: 'k' };
        const tokens = {
            buildUrl: jest.fn(
                () => 'https://api.nexlify.test/api/unsubscribe/tok',
            ),
        };
        const service = new DeliverabilityService(
            suppressionService as never,
            domainsRepo as never,
            encrypter as never,
            appConfig as never,
            tokens as never,
        );
        return { service, suppressionService, domainsRepo, encrypter, tokens };
    };

    it('looks up suppressions for every recipient with the email client', async () => {
        const blocking = {
            email: 'b@test.local',
            reason: SuppressionReasonEnum.HARD_BOUNCE,
        };
        const { service, suppressionService } = build({ blocking });

        const result = await service.findBlockingSuppression({
            ...email,
            to_email: 'a@test.local, b@test.local',
        } as never);

        expect(result).toBe(blocking);
        expect(suppressionService.findBlocking).toHaveBeenCalledWith(
            ['a@test.local', 'b@test.local'],
            7n,
        );
    });

    it('adds RFC 8058 List-Unsubscribe headers with a signed link for a single recipient', async () => {
        const { service, tokens } = build({ domain: null });

        const options = await service.buildSendOptions(email as never);

        expect(tokens.buildUrl).toHaveBeenCalledWith({
            email: 'dest@test.local',
            id_client: 7n,
        });
        expect(options.headers).toEqual({
            'List-Unsubscribe':
                '<https://api.nexlify.test/api/unsubscribe/tok>',
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        });
        expect(options.dkim).toBeUndefined();
    });

    it('omits the unsubscribe headers when the email has several recipients', async () => {
        const { service } = build({ domain: null });

        const options = await service.buildSendOptions({
            ...email,
            to_email: 'a@test.local,b@test.local',
        } as never);

        expect(options.headers).toBeUndefined();
    });

    it('DKIM-signs with the decrypted key when the from domain is DKIM-verified', async () => {
        const { service, domainsRepo, encrypter } = build();

        const options = await service.buildSendOptions(email as never);

        expect(domainsRepo.findByDomain).toHaveBeenCalledWith('acme.co');
        expect(encrypter.decrypt).toHaveBeenCalledWith('encrypted-pem', 'k');
        expect(options.dkim).toEqual({
            domainName: 'acme.co',
            keySelector: 'nexlify',
            privateKey: 'PEM(encrypted-pem,k)',
        });
    });

    it('does not sign when the domain is registered but DKIM is not verified', async () => {
        const { service } = build({
            domain: { ...verifiedDomain, dkim_verified: false },
        });

        expect(
            (await service.buildSendOptions(email as never)).dkim,
        ).toBeUndefined();
    });

    it('sends unsigned when the stored key cannot be decrypted', async () => {
        const { service } = build({ decryptThrows: true });

        expect(
            (await service.buildSendOptions(email as never)).dkim,
        ).toBeUndefined();
    });
});
