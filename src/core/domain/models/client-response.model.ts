export class ClientResponse<T = unknown> {
    public ok: boolean;
    public message: string;
    public data: T | null;

    constructor(data?: Partial<{ ok: boolean; message: string; data: T | null }>) {
        this.ok = data?.ok ?? false;
        this.message = data?.message ?? '';
        this.data = data?.data ?? null;
    }
}
