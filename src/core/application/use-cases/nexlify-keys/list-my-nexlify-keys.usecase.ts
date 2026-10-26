import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import type { INexlifyKeysRepository } from "src/core/application/contracts/persistence";
import { NexlifyKeys } from "src/core/domain/entities/nexlify-keys.entity";
import { UseCase, UseCaseArgs } from "src/core/domain/models/use-case.model";

export interface OwnedNexlifyKeyDTO {
    /** First/last four characters; the full hash is never returned in listings. */
    api_key_masked: string,
    id_nexlify_key: number,
    id_client: number,
    state: boolean,
    created_at: Date | null
}

export class ListMyNexlifyKeysUseCase implements UseCase<null, OwnedNexlifyKeyDTO[]> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _nexlifyKeysRepository: INexlifyKeysRepository,
    ) { }

    public run = async (_args: UseCaseArgs<null>): Promise<OwnedNexlifyKeyDTO[]> => {
        const auth = this._context.get();

        const keys = await this._nexlifyKeysRepository.findActiveByClientId(BigInt(auth!.id_user));

        return (keys ?? []).map((key: NexlifyKeys): OwnedNexlifyKeyDTO => ({
            api_key_masked: mask(key.api_key ?? ''),
            id_nexlify_key: Number(key.id_nexlify_key),
            id_client: Number(key.id_client),
            state: key.state ?? false,
            created_at: key.created_at,
        }));
    };
}

function mask(hashedKey: string): string {
    if (hashedKey.length <= 8) return '\u2026';
    return `${hashedKey.slice(0, 4)}\u2026${hashedKey.slice(-4)}`;
}
