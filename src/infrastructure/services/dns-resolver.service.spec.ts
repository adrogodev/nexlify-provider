jest.mock('node:dns/promises', () => ({ resolveTxt: jest.fn() }));

import { resolveTxt } from 'node:dns/promises';
import { DnsResolverService } from './dns-resolver.service';

const resolveTxtMock = resolveTxt as unknown as jest.Mock;

describe('DnsResolverService', () => {
    beforeEach(() => resolveTxtMock.mockReset());

    it('joins the character-string chunks of every TXT record', async () => {
        resolveTxtMock.mockResolvedValue([
            ['v=DKIM1; k=rsa; ', 'p=ABC'],
            ['v=spf1 ~all'],
        ]);

        await expect(
            new DnsResolverService().resolveTxt('example.com'),
        ).resolves.toEqual(['v=DKIM1; k=rsa; p=ABC', 'v=spf1 ~all']);
        expect(resolveTxtMock).toHaveBeenCalledWith('example.com');
    });

    it('resolves to an empty list when the lookup fails', async () => {
        resolveTxtMock.mockRejectedValue(
            Object.assign(new Error('queryTxt ENOTFOUND'), {
                code: 'ENOTFOUND',
            }),
        );

        await expect(
            new DnsResolverService().resolveTxt('missing.example'),
        ).resolves.toEqual([]);
    });
});
