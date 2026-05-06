export class AlreadyExistsException extends Error {
    readonly #code: string;

    constructor(message?: string) {
        super();
        this.#code = 'ALREADY_EXISTS';
        this.message = message ?? 'Registro existente';
        this.name = AlreadyExistsException.name;
    }

    get code(): string {
        return this.#code;
    }
}
