export const DNS_RESOLVER = Symbol('IDnsResolver');

export interface IDnsResolver {
    /**
     * TXT records published at `host`, each one with its character-string
     * chunks already joined. Resolution failures (NXDOMAIN, no data, timeouts)
     * resolve to an empty list: verification simply stays false.
     */
    resolveTxt(host: string): Promise<string[]>;
}
