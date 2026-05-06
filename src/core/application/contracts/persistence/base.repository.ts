export interface IBaseRepository<T, TId> {
    getAllAsync(): Promise<T[]>;
    getByIdAsync(id: TId): Promise<T | null>;
    create(entity: T): Promise<T>;
    update(id: TId, entity: T): Promise<T | null>;
    delete(id: TId): Promise<boolean>;
}
