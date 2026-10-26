import type { IHashGenerator, IRequestContext } from "src/core/application/contracts/infrastructure";
import type { INexlifyKeysRepository } from "src/core/application/contracts/persistence";
import { ActionNotAllowedException } from "src/core/domain/exceptions";
import { UseCase, UseCaseArgs } from "src/core/domain/models/use-case.model";

export interface GeneratedNexlifyKeyDTO {
    id_nexlify_key: bigint;
    id_client: bigint;
    /** The raw API key. Returned exactly once, never stored in plain text. */
    api_key: string;
    created_at: Date;
}

export class GenerateNexlifyKeyUseCase implements UseCase<{ id_client?: number | bigint }, GeneratedNexlifyKeyDTO> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _nexlifyKeysRepository: INexlifyKeysRepository,
        private readonly _hashGenerator: IHashGenerator,
    ) { }

    public run = async (args: UseCaseArgs<{ id_client?: number | bigint }>): Promise<GeneratedNexlifyKeyDTO> => {
        const auth = this._context.get();
        const authIsAdmin = auth?.is_admin === true;

        let id_client: bigint;
        const requested = args.data?.id_client;
        if (requested !== undefined && requested !== null) {
            if (!authIsAdmin) {
                throw new ActionNotAllowedException('Solo un administrador puede generar claves para otro cliente');
            }
            id_client = BigInt(requested);
        } else {
            if (auth === null || auth === undefined) {
                throw new ActionNotAllowedException('Sesion no valida para generar claves');
            }
            id_client = BigInt(auth!.id_user);
        }

        // One active key per client: previous ones are revoked.
        await this._nexlifyKeysRepository.deactivateAllByClientId(id_client);

        const rawKey = `NexlifyApiKey${id_client}${new Date().toISOString()}`;
        const created = await this._nexlifyKeysRepository.create({
            id_client,
            api_key: this._hashGenerator.SHA256(rawKey),
            state: true,
        });

        return {
            id_nexlify_key: created.id_nexlify_key,
            id_client,
            api_key: rawKey,
            created_at: new Date(),
        };
    };
}
