import { Injectable } from "@nestjs/common";
import { GetTemplatesFilters, ITemplatesRepository } from "src/core/application/contracts/persistence/templates.repository";
import { Template } from "src/core/domain/entities/template.entity";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";

@Injectable()
export class TemplatesRepository extends BaseRepository<Template, 'id_template'> implements ITemplatesRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'templates', 'id_template');
    }

    public async getAllWithFilters(filters: GetTemplatesFilters): Promise<Template[]> {
        return await this._model.findMany({
            where: this.#buildFilters(filters),
            orderBy: { created_at: 'desc' },
            skip: ((Math.max(1, filters.page ?? 1)) - 1) * Math.min(100, Math.max(1, filters.limit ?? 20)),
            take: Math.min(100, Math.max(1, filters.limit ?? 20)),
        });
    }

    public async countWithFilters(filters: GetTemplatesFilters): Promise<number> {
        return await this._model.count({ where: this.#buildFilters(filters) });
    }

    #buildFilters(filters: GetTemplatesFilters): Record<string, unknown> {
        return {
            is_active: filters.is_active,
        };
    }
}
