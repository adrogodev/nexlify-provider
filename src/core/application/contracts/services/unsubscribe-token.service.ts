export const UNSUBSCRIBE_TOKEN_SERVICE = Symbol('IUnsubscribeTokenService');

export interface UnsubscribeTokenPayload {
    email: string;
    /** null = the email was sent without a client (platform-wide suppression). */
    id_client: bigint | null;
}

export interface IUnsubscribeTokenService {
    /** Compact signed token carrying the recipient and the client. */
    sign(payload: UnsubscribeTokenPayload): string;
    /** The payload when the signature is valid; `null` for any tampered/malformed token. */
    verify(token: string): UnsubscribeTokenPayload | null;
    /** Absolute public URL of the unsubscribe endpoint for this payload. */
    buildUrl(payload: UnsubscribeTokenPayload): string;
}
