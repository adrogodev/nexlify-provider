import { Injectable } from "@nestjs/common";
import { IClientCredentialsRepository } from "src/core/application/contracts/persistence";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";
import { ClientCredentials } from "src/core/domain/entities/client_credentials.entity";

@Injectable()
export class ClientCredentialsRepository extends BaseRepository<ClientCredentials, 'id_client_credential'> implements IClientCredentialsRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'client_credentials', 'id_client_credential');
    }

    public async findByTokenJTI(jti: string): Promise<Nullable<ClientCredentials>> {
        return await this._model.findFirst({
            where: {
                assign_credentials_token_jti: jti
            }
        })
    }
}