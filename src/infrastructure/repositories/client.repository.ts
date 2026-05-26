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
}