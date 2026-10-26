import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import type { IClientRepository } from "src/core/application/contracts/persistence";
import type { EntityUpdateInput } from "src/core/application/contracts/persistence/base.repository";
import { ActionNotAllowedException, NotFoundException } from "src/core/domain/exceptions";
import type { Client } from "src/core/domain/entities/client.entity";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { UpdateClientInput } from "./update-client.request-data";

export class UpdateClientUseCase implements UseCase<UpdateClientInput, boolean> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _clientRepository: IClientRepository,
    ) { }

    public run = async (args: UseCaseArgs<UpdateClientInput>): Promise<boolean> => {
        const auth = this._context.get();
        const authIsAdmin = auth?.is_admin === true;

        let id_client: bigint;
        const requested = args.data.id_client;
        if (requested !== undefined && requested !== null) {
            if (!authIsAdmin) {
                throw new ActionNotAllowedException('Solo un administrador puede actualizar otro cliente');
            }
            id_client = BigInt(requested);
        }
        else {
            id_client = BigInt(auth.id_user);
        }

        const client = await this._clientRepository.getByIdAsync(id_client);
        if (!client) throw new NotFoundException('Cliente no encontrado');

        // Only contact fields; identity and state fields are never part of the patch.
        const patch: EntityUpdateInput<Client, 'id_client'> = {
            name: args.data.name,
            email: args.data.email,
            cell_callsign: args.data.cell_callsign,
            cell_phone: args.data.cell_phone,
            user_first_name: args.data.user_first_name,
            user_second_name: args.data.user_second_name,
            user_first_surname: args.data.user_first_surname,
            user_second_surname: args.data.user_second_surname,
        };

        await this._clientRepository.update(id_client, patch);

        return true;
    };
}
