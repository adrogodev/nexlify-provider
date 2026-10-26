import { Injectable } from "@nestjs/common";
import { GetUsersFilters, IUsersRepository } from "src/core/application/contracts/persistence/users.repository";
import { User } from "src/core/domain/entities/user.entity";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";

@Injectable()
export class UsersRepository extends BaseRepository<User, 'id_user'> implements IUsersRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'users', 'id_user');
    }

    public async getAllWithFilters(filters: GetUsersFilters): Promise<User[]> {
        return await this._model.findMany({
            where: this.#buildFilters(filters),
            orderBy: { id_user: 'desc' },
            skip: ((Math.max(1, filters.page ?? 1)) - 1) * Math.min(100, Math.max(1, filters.limit ?? 20)),
            take: Math.min(100, Math.max(1, filters.limit ?? 20)),
        });
    }

    public async countWithFilters(filters: GetUsersFilters): Promise<number> {
        return await this._model.count({ where: this.#buildFilters(filters) });
    }

    #buildFilters(filters: GetUsersFilters): Record<string, unknown> {
        return {
            id_client: filters.id_client,
        };
    }
}
