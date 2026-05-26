import { Injectable } from "@nestjs/common";
import { INexlifyConfigurationRepository } from "src/core/application/contracts/persistence/nexlify-configuration.repository";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";
import { NexlifyConfiguration } from "src/core/domain/entities/nexlify-configuration.entity";

@Injectable()
export class NexlifyConfigurationRepository extends BaseRepository<NexlifyConfiguration, 'id_configuration'> implements INexlifyConfigurationRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'nexlify_configuration', 'id_configuration');
    }

    public async findConfiguration(): Promise<Nullable<NexlifyConfiguration>> {
        return await this._model.findFirst();
    }
}
