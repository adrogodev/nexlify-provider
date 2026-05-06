import type { Prisma } from '@prisma/client';
import type { IBaseRepository } from '../../core/application/contracts/persistence/base.repository';
import { PrismaService } from '../prisma/prisma.service';

export abstract class BaseRepository<T, TId> implements IBaseRepository<T, TId> {
    protected _transaction: Prisma.TransactionClient | null = null;

    constructor(
        protected readonly prisma: PrismaService,
        private readonly modelKey: string,
        private readonly idKey: string,
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

    public async getByIdAsync(id: TId): Promise<T | null> {
        return await this._model.findUnique({ where: { [this.idKey]: id } });
    }

    public async create(entity: T): Promise<T> {
        const { [this.idKey]: _id, ...data } = entity as any;
        return await this._model.create({ data });
    }

    public async update(id: TId, entity: T): Promise<T | null> {
        const { [this.idKey]: _id, ...data } = entity as any;
        await this._model.update({ where: { [this.idKey]: id }, data });
        return await this.getByIdAsync(id);
    }

    public async delete(id: TId): Promise<boolean> {
        const result = await this._model.deleteMany({ where: { [this.idKey]: id } });
        return result.count > 0;
    }
}
