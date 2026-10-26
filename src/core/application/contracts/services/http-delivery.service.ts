/**
 * Outbound webhook HTTP port: the scheduler serializes and signs the payload,
 * the adapter only performs the POST and classifies the transport outcome.
 */
export const HTTP_DELIVERY_SERVICE = Symbol('IHttpDeliveryService');

export interface HttpDeliveryRequest {
    /** Absolute endpoint URL that should receive the webhook. */
    url: string;
    /** The exact serialized body string: the HMAC signature covers this text. */
    body: string;
    headers: Record<string, string>;
}

export interface HttpDeliveryResult {
    /** True only on 2xx: timeouts and 1xx/3xx/4xx/5xx are delivery failures. */
    ok: boolean;
    /** HTTP status of the response, or null on network/timeout errors. */
    status_code: number | null;
    /** Human-readable failure description, or null when delivered. */
    error: string | null;
}

export interface IHttpDeliveryService {
    post(request: HttpDeliveryRequest): Promise<HttpDeliveryResult>;
}
