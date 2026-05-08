export class ActionNotAllowedException extends Error {
    readonly #code: string;

    constructor(message?: string) {
        super();
        this.#code = 'ACTION_NOT_ALLOWED';
        this.message = message ?? 'Acción no permitida';
        this.name = ActionNotAllowedException.name;
    }

    get code(): string {
        return this.#code;
    }
}
