import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type {
    IUnsubscribeTokenService,
    UnsubscribeTokenPayload,
} from 'src/core/application/contracts/services';

interface TokenBody {
    /** recipient address (lower-cased) */
    e: string;
    /** id_client as a decimal string, or null */
    c: string | null;
}

/**
 * Compact signed unsubscribe token (S5): `base64url(json).base64url(hmac)`.
 * HMAC-SHA256 keyed by a purpose-bound key derived from ENCRYPT_KEY, so the
 * token can never be confused with any other signature in the platform.
 * Tokens do not expire: unsubscribe links must keep working.
 */
export class UnsubscribeTokenService implements IUnsubscribeTokenService {
    readonly #key: Buffer;
    readonly #baseUrl: string;

    constructor(secret: string, publicBaseUrl: string) {
        this.#key = createHash('sha256')
            .update(`nexlify:unsubscribe:${secret}`)
            .digest();
        this.#baseUrl = publicBaseUrl.replace(/\/+$/, '');
    }

    public sign = (payload: UnsubscribeTokenPayload): string => {
        const body: TokenBody = {
            e: payload.email.trim().toLowerCase(),
            c: payload.id_client === null ? null : payload.id_client.toString(),
        };
        const encoded = Buffer.from(JSON.stringify(body), 'utf8').toString(
            'base64url',
        );
        return `${encoded}.${this.#signature(encoded)}`;
    };

    public verify = (token: string): UnsubscribeTokenPayload | null => {
        if (typeof token !== 'string') return null;
        const parts = token.split('.');
        if (parts.length !== 2 || parts[0] === '' || parts[1] === '')
            return null;
        const [encoded, signature] = parts;

        const expected = Buffer.from(this.#signature(encoded), 'base64url');
        const received = Buffer.from(signature, 'base64url');
        if (
            expected.length !== received.length ||
            !timingSafeEqual(expected, received)
        )
            return null;

        try {
            const body = JSON.parse(
                Buffer.from(encoded, 'base64url').toString('utf8'),
            ) as Partial<TokenBody>;
            if (typeof body.e !== 'string' || body.e === '') return null;
            if (
                body.c !== null &&
                (typeof body.c !== 'string' || !/^\d+$/.test(body.c))
            )
                return null;
            return {
                email: body.e,
                id_client: body.c === null ? null : BigInt(body.c),
            };
        } catch {
            return null;
        }
    };

    public buildUrl = (payload: UnsubscribeTokenPayload): string =>
        `${this.#baseUrl}/api/unsubscribe/${this.sign(payload)}`;

    #signature(encoded: string): string {
        return createHmac('sha256', this.#key)
            .update(encoded)
            .digest('base64url');
    }
}
