import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { clients } from "@prisma/client";
import { IClientRepository } from "src/core/application/contracts/persistence";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ClientRepository extends BaseRepository<clients, 'id_client'> implements IClientRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'clients', 'id_client');
    }
}