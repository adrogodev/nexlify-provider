export class UnauthorizedException extends Error {
    readonly #code: string;

    constructor(message?: string) {
        super();
        this.#code = 'UNAUTHORIZED';
        this.message = message ?? 'No autorizado';
        this.name = UnauthorizedException.name;
    }

    get code(): string {
        return this.#code;
    }
}
