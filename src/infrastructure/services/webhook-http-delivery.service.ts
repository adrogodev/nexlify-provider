import { Injectable } from "@nestjs/common";
import type { HttpDeliveryRequest, HttpDeliveryResult, IHttpDeliveryService } from "src/core/application/contracts/services/http-delivery.service";

const DELIVERY_TIMEOUT_MS = 10_000;

/**
 * Global-fetch adapter for the IHttpDeliveryService port. Serialization and
 * HMAC signing live in the scheduler; this class only ships the request and
 * classifies the outcome: 2xx delivered, 1xx/3xx/4xx/5xx/timeouts failed.
 */
@Injectable()
export class WebhookHttpDeliveryService implements IHttpDeliveryService {

    public post = async (request: HttpDeliveryRequest): Promise<HttpDeliveryResult> => {
        try {
            const response = await fetch(request.url, {
                method: 'POST',
                headers: request.headers,
                body: request.body,
                signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
            });

            if (response.ok) {
                return { ok: true, status_code: response.status, error: null };
            }
            return { ok: false, status_code: response.status, error: `HTTP ${response.status}` };

        } catch (error) {
            const message = `Fallo la entrega del webhook: ${error}`;
            return { ok: false, status_code: null, error: message };
        }
    }
}
