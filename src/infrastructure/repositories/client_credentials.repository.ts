import { Injectable } from "@nestjs/common";
import { client_credentials } from "@prisma/client";
import { IClientCredentialsRepository } from "src/core/application/contracts/persistence";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";

@Injectable()
export class ClientCredentialsRepository extends BaseRepository<client_credentials, 'id_client_credential'> implements IClientCredentialsRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'client_credentials', 'id_client_credential');
    }
}