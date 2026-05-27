import { NexlifyKeysLogs } from "src/core/domain/entities/nexlify-keys-logs.entity";
import { IBaseRepository } from "./base.repository";

export const NEXLIFY_KEYS_LOGS_REPOSITORY = Symbol("INexlifyKeysLogsRepository");

export interface INexlifyKeysLogsRepository extends IBaseRepository<NexlifyKeysLogs, 'id_nexlify_key_log'> {
    findByClientId(id: bigint): Promise<Nullable<NexlifyKeysLogs[]>>;
}
