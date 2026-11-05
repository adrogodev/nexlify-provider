import { createHmac } from 'node:crypto';
import type { IWebhookSigner } from 'src/core/application/contracts/infrastructure';

/** HMAC-SHA256 hex of the exact serialized body (the `X-Nexlify-Signature` value). */
export function signWebhookBody(secret: string, body: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
}

export class WebhookSignerHelper implements IWebhookSigner {
    public sign(secret: string, body: string): string {
        return signWebhookBody(secret, body);
    }
}
