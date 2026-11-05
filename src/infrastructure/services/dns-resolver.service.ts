import { resolveTxt } from 'node:dns/promises';
import type { IDnsResolver } from 'src/core/application/contracts/services';

/** TXT lookups for sending-domain verification (S4) over the system resolver. */
export class DnsResolverService implements IDnsResolver {
    public resolveTxt = async (host: string): Promise<string[]> => {
        try {
            const records = await resolveTxt(host);
            return records.map((chunks) => chunks.join(''));
        } catch {
            // NXDOMAIN / ENODATA / timeouts: the record is simply not there (yet).
            return [];
        }
    };
}
