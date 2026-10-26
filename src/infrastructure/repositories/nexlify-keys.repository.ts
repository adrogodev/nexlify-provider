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

    public async findActiveByHashedKey(hashedKey: string): Promise<NexlifyKeys | null> {
        return await this._model.findFirst({
            where: { api_key: hashedKey, state: true }
        })
    }

    public async findActiveByClientId(id_client: bigint): Promise<Nullable<NexlifyKeys[]>> {
        return await this._model.findMany({
            where: { id_client, state: true }
        })
    }

    public async deactivateAllByClientId(id_client: bigint): Promise<number> {
        const result = await this._model.updateMany({
            where: { id_client, state: true },
            data: { state: false, updated_at: new Date() }
        })
        return result.count
    }
}
