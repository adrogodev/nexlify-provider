import { Injectable } from "@nestjs/common";
import { INexlifyKeysLogsRepository } from "src/core/application/contracts/persistence/nexlify-keys-logs.repository";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";
import { NexlifyKeysLogs } from "src/core/domain/entities/nexlify-keys-logs.entity";

@Injectable()
export class NexlifyKeysLogsRepository extends BaseRepository<NexlifyKeysLogs, 'id_nexlify_key_log'> implements INexlifyKeysLogsRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'nexlify_keys_logs', 'id_nexlify_key_log');
    }

    public async findByClientId(id: bigint): Promise<Nullable<NexlifyKeysLogs[]>> {
        return await this._model.findMany({
            where: { id_client: id }
        })
    }
}
