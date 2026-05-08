import { Injectable } from "@nestjs/common";
import { nexlify_configuration } from "@prisma/client";
import { INexlifyConfigurationRepository } from "src/core/application/contracts/persistence/nexlify-configuration.repository";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";

@Injectable()
export class NexlifyConfigurationRepository extends BaseRepository<nexlify_configuration, 'id_configuration'> implements INexlifyConfigurationRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'nexlify_configuration', 'id_configuration');
    }

    public async findConfiguration(): Promise<Nullable<nexlify_configuration>> {
        return await this._model.findFirst();
    }
}
