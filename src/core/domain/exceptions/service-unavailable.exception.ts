/** A feature that depends on an optional external service is not configured (HTTP 503). */
export class ServiceUnavailableException extends Error {
    readonly #code: string;

    constructor(message?: string) {
        super();
        this.#code = 'SERVICE_UNAVAILABLE';
        this.message = message ?? 'Servicio no disponible';
        this.name = ServiceUnavailableException.name;
    }

    get code(): string {
        return this.#code;
    }
}
