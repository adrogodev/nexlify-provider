type DBAutoFields = 'created_at' | 'updated_at';

export type EntityInput<T, TIdKey extends keyof T> = Omit<T, TIdKey | Extract<DBAutoFields, keyof T>>;

export interface IBaseRepository<T, TIdKey extends keyof T> {
    getAllAsync(): Promise<T[]>;
    getByIdAsync(id: T[TIdKey]): Promise<T | null>;
    create(entity: EntityInput<T, TIdKey>): Promise<T>;
    update(id: T[TIdKey], entity: T): Promise<T | null>;
    delete(id: T[TIdKey]): Promise<boolean>;
}
