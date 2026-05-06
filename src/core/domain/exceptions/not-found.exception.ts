export class NotFoundException extends Error {
    readonly #code: string;

    constructor(message?: string) {
        super();
        this.#code = 'NOT_FOUND';
        this.message = message ?? 'Registro no encontrado';
        this.name = NotFoundException.name;
    }

    get code(): string {
        return this.#code;
    }
}
