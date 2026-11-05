import { isIP } from 'node:net';
import type {
    INexlifyConfigurationRepository,
    ISmtpServerRepository,
} from 'src/core/application/contracts/persistence';

/**
 * SPF mechanism suggested for sending domains (S4), derived from the SMTP
 * server of the global configuration:
 * - hostname → `a:<host>` (authorizes the relay's A record; `include:` would
 *   require the relay to publish its own SPF record, which is not guaranteed)
 * - IPv4/IPv6 → `ip4:` / `ip6:`
 * - no SMTP server configured → `mx`
 */
export class SpfPolicyService {
    constructor(
        private readonly _nexlifyConfigurationRepository: INexlifyConfigurationRepository,
        private readonly _smtpServerRepository: ISmtpServerRepository,
    ) {}

    public mechanism = async (): Promise<string> => {
        const configuration =
            await this._nexlifyConfigurationRepository.findConfiguration();
        if (
            configuration === null ||
            configuration.id_smtp_server === null ||
            configuration.id_smtp_server === undefined
        ) {
            return 'mx';
        }
        const smtpServer = await this._smtpServerRepository.getByIdAsync(
            configuration.id_smtp_server,
        );
        const host = smtpServer?.host?.trim().toLowerCase();
        if (!host) return 'mx';

        const ipVersion = isIP(host);
        if (ipVersion === 4) return `ip4:${host}`;
        if (ipVersion === 6) return `ip6:${host}`;
        return `a:${host}`;
    };

    public static recordValue(mechanism: string): string {
        return `v=spf1 ${mechanism} ~all`;
    }

    /** A published SPF record authorizes us when it carries the suggested mechanism (`mx` accepts any SPF record). */
    public static isAuthorized(records: string[], mechanism: string): boolean {
        const expected = mechanism.toLowerCase();
        return records.some((record) => {
            const tokens = record.trim().toLowerCase().split(/\s+/);
            if (tokens[0] !== 'v=spf1') return false;
            return (
                expected === 'mx' ||
                tokens.includes(expected) ||
                tokens.includes(`+${expected}`)
            );
        });
    }
}
