import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import type { EntityUpdateInput, IUsersRepository } from "src/core/application/contracts/persistence";
import type { UserInfoDTO } from "src/core/application/dtos";
import { ActionNotAllowedException, NotFoundException } from "src/core/domain/exceptions";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { UserMapper } from "src/core/application/mappers";
import type { User } from "src/core/domain/entities/user.entity";
import { UpdateUserInput } from "./update-user.request-data";

export class UpdateUserUseCase implements UseCase<UpdateUserInput, UserInfoDTO> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _usersRepository: IUsersRepository,
    ) { }

    public run = async (args: UseCaseArgs<UpdateUserInput>): Promise<UserInfoDTO> => {
        const auth = this._context.get();
        const authIsAdmin = auth?.is_admin === true;

        const user = await this._usersRepository.getByIdAsync(args.data.id_user);
        if (!user) throw new NotFoundException('Usuario no encontrado');

        if (!authIsAdmin && (user.id_client === null || user.id_client !== BigInt(auth.id_user))) {
            throw new ActionNotAllowedException('No tiene permisos para modificar este usuario');
        }

        // Only profile fields plus the state toggle: id_client and the auto
        // PK/timestamps are never part of the patch.
        const patch: EntityUpdateInput<User, 'id_user'> = {
            id_number: args.data.id_number,
            first_name: args.data.first_name,
            second_name: args.data.second_name,
            first_surname: args.data.first_surname,
            second_surname: args.data.second_surname,
            email: args.data.email,
            cell_callsign: args.data.cell_callsign,
            cell_phone: args.data.cell_phone,
            birthdate: args.data.birthdate === undefined ? undefined : new Date(args.data.birthdate),
            state: args.data.state,
        };

        const updated = await this._usersRepository.update(args.data.id_user, patch);

        return UserMapper.mapUser(updated ?? user);
    };
}
