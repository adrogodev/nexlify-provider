export class UnauthenticatedException extends Error {
    readonly #code: string;

    constructor(message?: string) {
        super();
        this.#code = 'UNAUTHENTICATED';
        this.message = message ?? 'No autenticado';
        this.name = UnauthenticatedException.name;
    }

    get code(): string {
        return this.#code;
    }
}
