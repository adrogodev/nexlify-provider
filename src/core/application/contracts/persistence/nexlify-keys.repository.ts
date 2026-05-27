import { NexlifyKeys } from "src/core/domain/entities/nexlify-keys.entity";
import { IBaseRepository } from "./base.repository";

export const NEXLIFY_KEYS_REPOSITORY = Symbol("INexlifyKeysRepository");

export interface INexlifyKeysRepository extends IBaseRepository<NexlifyKeys, 'id_nexlify_key'> {
    findByClientId(id: bigint): Promise<Nullable<NexlifyKeys[]>>;
}
