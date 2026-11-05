import type {
    IAppConfig,
    IEncrypter,
} from 'src/core/application/contracts/infrastructure';
import type { ISendingDomainsRepository } from 'src/core/application/contracts/persistence';
import type { IUnsubscribeTokenService } from 'src/core/application/contracts/services';
import type { Email } from 'src/core/domain/entities/email.entity';
import type { Suppression } from 'src/core/domain/entities/suppression.entity';
import type { DkimSigningOptions } from 'src/core/domain/models';
import type { SuppressionService } from '../../suppressions/services/suppression.service';

export interface DeliverabilityOptions {
    headers?: Record<string, string>;
    dkim?: DkimSigningOptions;
}

export const splitRecipients = (toEmail: string): string[] =>
    toEmail
        .split(',')
        .map((recipient) => recipient.trim())
        .filter((recipient) => recipient !== '');

/**
 * Send-path policies shared by every attempt (S4/S5): the suppression gate,
 * RFC 8058 one-click unsubscribe headers and DKIM signing for verified
 * sending domains.
 */
export class DeliverabilityService {
    constructor(
        private readonly _suppressionService: SuppressionService,
        private readonly _sendingDomainsRepository: ISendingDomainsRepository,
        private readonly _encrypter: IEncrypter,
        private readonly _appConfig: IAppConfig,
        private readonly _unsubscribeTokens: IUnsubscribeTokenService,
    ) {}

    /** The suppression that blocks this email, or null when it may be sent. */
    public findBlockingSuppression = async (
        email: Email,
    ): Promise<Suppression | null> =>
        this._suppressionService.findBlocking(
            splitRecipients(email.to_email),
            email.id_client,
        );

    public buildSendOptions = async (
        email: Email,
    ): Promise<DeliverabilityOptions> => {
        const options: DeliverabilityOptions = {};

        // A token identifies ONE recipient: a multi-recipient email gets no
        // unsubscribe link rather than one that would suppress someone else.
        const recipients = splitRecipients(email.to_email);
        if (recipients.length === 1) {
            const url = this._unsubscribeTokens.buildUrl({
                email: recipients[0],
                id_client: email.id_client,
            });
            options.headers = {
                'List-Unsubscribe': `<${url}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            };
        }

        const dkim = await this.#dkimFor(email.from_email);
        if (dkim !== null) options.dkim = dkim;

        return options;
    };

    async #dkimFor(fromEmail: string): Promise<DkimSigningOptions | null> {
        const at = fromEmail.lastIndexOf('@');
        if (at < 0) return null;
        const domainName = fromEmail
            .slice(at + 1)
            .trim()
            .toLowerCase();
        if (domainName === '') return null;

        try {
            const domain =
                await this._sendingDomainsRepository.findByDomain(domainName);
            if (domain === null || !domain.dkim_verified) return null;
            return {
                domainName: domain.domain,
                keySelector: domain.dkim_selector,
                privateKey: this._encrypter.decrypt(
                    domain.dkim_private_key,
                    this._appConfig.ENCRYPT_KEY,
                ),
            };
        } catch {
            // A broken key or lookup never blocks the send: it goes out unsigned.
            return null;
        }
    }
}
