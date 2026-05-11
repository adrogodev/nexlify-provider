type DBAutoFields = 'created_at' | 'updated_at';

type AllowUndefinedOnNullable<T> = {
    [K in keyof T]: null extends T[K] ? T[K] | undefined : T[K];
};

export type EntityInput<T, TIdKey extends keyof T> = AllowUndefinedOnNullable<
    Omit<T, TIdKey | Extract<DBAutoFields, keyof T>>
>;

export interface IBaseRepository<T, TIdKey extends keyof T> {
    getAllAsync(): Promise<T[]>;
    getByIdAsync(id: T[TIdKey]): Promise<T | null>;
    create(entity: EntityInput<T, TIdKey>): Promise<T>;
    update(id: T[TIdKey], entity: T): Promise<T | null>;
    delete(id: T[TIdKey]): Promise<boolean>;
}
