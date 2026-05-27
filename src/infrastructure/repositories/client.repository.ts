import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { IClientRepository } from "src/core/application/contracts/persistence";
import { PrismaService } from "../prisma/prisma.service";
import { Client } from "src/core/domain/entities/client.entity";

@Injectable()
export class ClientRepository extends BaseRepository<Client, 'id_client'> implements IClientRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'clients', 'id_client');
    }

    public async verifyIfExist(id_number: string): Promise<boolean> {
        return await this._model.count({ where: { id_number } }) > 0;

    }

    public async getAllClientByFilters(page: number, size: number, id_state: number, id_type: number, id_number: string, name: string): Promise<{ count: number; data: Nullable<Client[]>; }> {
        const where: Record<string, any> = {};

        if (id_state) where.id_state = id_state;
        if (id_type) where.id_type = id_type;
        if (id_number) where.id_number = id_number;

        if (name) where.name = { contains: name, mode: 'insensitive' };

        const skip = (page - 1) * size;

        const total_items = await this._model.count();
        const clients = await this._model.findMany({ where, take: size, skip, orderBy: { id_client: "desc" } });

        return { count: total_items, data: clients }
    }

}