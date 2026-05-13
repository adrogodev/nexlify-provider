import type { Prisma } from '@prisma/client';
import type { EntityInput, EntityUpdateInput, IBaseRepository } from '../../core/application/contracts/persistence/base.repository';
import { PrismaService } from '../prisma/prisma.service';

export abstract class BaseRepository<T, TIdKey extends keyof T> implements IBaseRepository<T, TIdKey> {
    protected _transaction: Prisma.TransactionClient | null = null;

    constructor(
        protected readonly prisma: PrismaService,
        private readonly modelKey: string,
        private readonly idKey: TIdKey,
    ) { }

    protected get _model(): any {
        return (this._transaction ?? this.prisma)[this.modelKey];
    }

    public setTransaction(transaction: Prisma.TransactionClient | null): void {
        this._transaction = transaction;
    }

    public async getAllAsync(): Promise<T[]> {
        return await this._model.findMany();
    }

    public async getByIdAsync(id: T[TIdKey]): Promise<T | null> {
        return await this._model.findUnique({ where: { [this.idKey]: id } });
    }

    public async create(entity: EntityInput<T, TIdKey>): Promise<T> {
        return await this._model.create({ data: entity });
    }

    public async update(id: T[TIdKey], entity: T | EntityUpdateInput<T, TIdKey>): Promise<T | null> {
        const entityWithAutoFields = entity as T & { created_at?: Date; updated_at?: Date };
        const { [this.idKey]: _id, created_at: _ca, updated_at: _ua, ...data } = entityWithAutoFields;
        await this._model.update({ where: { [this.idKey]: id }, data: { ...data, updated_at: new Date() } });
        return await this.getByIdAsync(id);
    }

    public async delete(id: T[TIdKey]): Promise<boolean> {
        const result = await this._model.deleteMany({ where: { [this.idKey]: id } });
        return result.count > 0;
    }
}
