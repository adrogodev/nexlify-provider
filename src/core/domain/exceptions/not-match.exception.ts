export class NotMatchException extends Error {
    readonly #code: string;

    constructor(message?: string) {
        super();
        this.#code = 'NOT_MATCH';
        this.message = message ?? 'Datos no coincidentes';
        this.name = NotMatchException.name;
    }

    get code(): string {
        return this.#code;
    }
}
