import { Injectable } from '@nestjs/common';
import type {
    GetSuppressionsFilters,
    ISuppressionsRepository,
} from 'src/core/application/contracts/persistence/suppressions.repository';
import { Suppression } from 'src/core/domain/entities/suppression.entity';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class SuppressionsRepository
    extends BaseRepository<Suppression, 'id_suppression'>
    implements ISuppressionsRepository
{
    constructor(prisma: PrismaService) {
        super(prisma, 'suppressions', 'id_suppression');
    }

    public async findByUuid(
        suppressionUuid: string,
    ): Promise<Suppression | null> {
        return await this._model.findUnique({
            where: { suppression_uuid: suppressionUuid },
        });
    }

    public async findByClientAndEmail(
        idClient: bigint | null,
        email: string,
    ): Promise<Suppression | null> {
        return await this._model.findFirst({
            where: {
                id_client: idClient,
                email: { equals: email, mode: 'insensitive' },
            },
        });
    }

    public async findAllByEmail(email: string): Promise<Suppression[]> {
        return await this._model.findMany({
            where: { email: { equals: email, mode: 'insensitive' } },
            orderBy: { id_suppression: 'asc' },
        });
    }

    public async getAllWithFilters(
        filters: GetSuppressionsFilters,
    ): Promise<Suppression[]> {
        return await this._model.findMany({
            where: this.#buildFilters(filters),
            orderBy: { id_suppression: 'desc' },
            skip:
                (Math.max(1, filters.page ?? 1) - 1) *
                Math.min(100, Math.max(1, filters.limit ?? 20)),
            take: Math.min(100, Math.max(1, filters.limit ?? 20)),
        });
    }

    public async countWithFilters(
        filters: GetSuppressionsFilters,
    ): Promise<number> {
        return await this._model.count({ where: this.#buildFilters(filters) });
    }

    #buildFilters(filters: GetSuppressionsFilters): Record<string, unknown> {
        return {
            id_client: filters.id_client,
            reason: filters.reason,
            email: filters.email
                ? { contains: filters.email.trim(), mode: 'insensitive' }
                : undefined,
        };
    }
}
