import { Injectable } from "@nestjs/common";
import { INexlifyKeysRepository } from "src/core/application/contracts/persistence/nexlify-keys.repository";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";
import { NexlifyKeys } from "src/core/domain/entities/nexlify-keys.entity";

@Injectable()
export class NexlifyKeysRepository extends BaseRepository<NexlifyKeys, 'id_nexlify_key'> implements INexlifyKeysRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'nexlify_keys', 'id_nexlify_key');
    }

    public async findByClientId(id: bigint): Promise<Nullable<NexlifyKeys[]>> {
        return await this._model.findMany({
            where: { id_client: id }
        })
    }
}
