export const WEBHOOK_SIGNER = Symbol('IWebhookSigner');

/**
 * Outbound webhook signature: HMAC-SHA256 hex of the EXACT serialized body
 * with the endpoint secret (`X-Nexlify-Signature`). One implementation is
 * shared by the delivery scheduler and the synchronous test ping.
 */
export interface IWebhookSigner {
    sign(secret: string, body: string): string;
}
