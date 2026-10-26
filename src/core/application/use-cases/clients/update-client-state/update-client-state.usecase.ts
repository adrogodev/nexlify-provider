import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import type { IClientRepository } from "src/core/application/contracts/persistence";
import { ActionNotAllowedException, NotFoundException } from "src/core/domain/exceptions";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { UpdateClientStateInput } from "./update-client-state.request-data";

export class UpdateClientStateUseCase implements UseCase<UpdateClientStateInput, boolean> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _clientRepository: IClientRepository,
    ) { }

    public run = async (args: UseCaseArgs<UpdateClientStateInput>): Promise<boolean> => {
        const auth = this._context.get();

        if (auth?.is_admin !== true) {
            throw new ActionNotAllowedException('Solo un administrador puede cambiar el estado de un cliente');
        }

        const id_client = BigInt(args.data.id_client);
        const client = await this._clientRepository.getByIdAsync(id_client);
        if (!client) throw new NotFoundException('Cliente no encontrado');

        await this._clientRepository.update(id_client, { id_client_state: args.data.id_client_state });

        return true;
    };
}
