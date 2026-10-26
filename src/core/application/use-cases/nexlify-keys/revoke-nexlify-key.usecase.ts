import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import type { INexlifyKeysRepository } from "src/core/application/contracts/persistence";
import { NotFoundException } from "src/core/domain/exceptions";
import { UseCase, UseCaseArgs } from "src/core/domain/models/use-case.model";

export class RevokeNexlifyKeyUseCase implements UseCase<bigint, boolean> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _nexlifyKeysRepository: INexlifyKeysRepository,
    ) { }

    public run = async (args: UseCaseArgs<bigint>): Promise<boolean> => {
        const auth = this._context.get();
        const keyId = BigInt(args.data);

        const key = await this._nexlifyKeysRepository.getByIdAsync(keyId);
        if (key === null || key.id_client === null) {
            throw new NotFoundException('La clave solicitada no existe');
        }

        if (auth?.is_admin !== true && BigInt(auth!.id_user) !== key.id_client) {
            // Same response as a missing key: never disclose another client's key existence.
            throw new NotFoundException('La clave solicitada no existe');
        }

        return await this._nexlifyKeysRepository.delete(key.id_nexlify_key);
    };
}
