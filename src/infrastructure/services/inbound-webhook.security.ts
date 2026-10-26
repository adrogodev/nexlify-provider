import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppEnvs } from '../environments/app-env.config';

/**
 * Pure verification wrapper for the inbound webhook shared-secret scheme. The
 * signature is the HMAC-SHA256 hex of the EXACT raw request bytes, keyed by
 * `AppEnvs.INBOUND_WEBHOOK_SECRET` (required env). No HTTP layer lives here:
 * the controller hands in the raw body string and the header value, this
 * service verifies the bytes.
 */
export class InboundWebhookSecurityService {

    /** HMAC-SHA256 hex signature of a raw body with the configured shared secret. */
    public sign = (rawBody: string): string => {
        return createHmac('sha256', AppEnvs.INBOUND_WEBHOOK_SECRET).update(rawBody).digest('hex');
    }

    /** True only when the header carries the expected hex signature for these raw bytes. */
    public verify = (rawBody: string, signatureHeader?: string): boolean => {
        if (typeof signatureHeader !== 'string' || signatureHeader === '') {
            return false;
        }
        return this.#safeEqual(this.sign(rawBody), signatureHeader);
    }

    #safeEqual(expectedHex: string, receivedHex: string): boolean {
        const expected = Buffer.from(expectedHex, 'hex');
        const received = Buffer.from(receivedHex, 'hex');
        if (expected.length === 0 || received.length === 0 || expected.length !== received.length) {
            return false;
        }
        return timingSafeEqual(expected, received);
    }

}
