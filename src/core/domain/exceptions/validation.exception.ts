export class ValidationException extends Error {
    readonly #code: string;
    readonly #errors: Record<string, string[]>;

    constructor(errors: Record<string, string[]>) {
        super();
        this.#code = 'VALIDATION_ERROR';
        this.message = 'Hubo uno o más errores de validación';
        this.#errors = errors;
        this.name = ValidationException.name;
    }

    get code(): string {
        return this.#code;
    }

    get errors(): Record<string, string[]> {
        return this.#errors;
    }
}
