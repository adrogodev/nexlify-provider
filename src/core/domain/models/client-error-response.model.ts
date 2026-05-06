export class ClientErrorResponse<T = unknown> {
    public ok: boolean;
    public code: string;
    public message: string;
    public errors?: T;

    constructor(data?: Partial<{ ok: boolean; code: string; message: string; errors: T }>) {
        this.ok = data?.ok ?? false;
        this.code = data?.code ?? 'ERROR';
        this.message = data?.message ?? '';
        if (data?.errors !== undefined) this.errors = data.errors;
    }
}
