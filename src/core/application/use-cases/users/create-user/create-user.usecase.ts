import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import type { IUsersRepository } from "src/core/application/contracts/persistence";
import type { UserInfoDTO } from "src/core/application/dtos";
import { ActionNotAllowedException } from "src/core/domain/exceptions";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { UserMapper } from "src/core/application/mappers";
import { CreateUserInput } from "./create-user.request-data";

export class CreateUserUseCase implements UseCase<CreateUserInput, UserInfoDTO> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _usersRepository: IUsersRepository,
    ) { }

    public run = async (args: UseCaseArgs<CreateUserInput>): Promise<UserInfoDTO> => {
        const auth = this._context.get();
        const authIsAdmin = auth?.is_admin === true;

        let id_client: bigint | null = null;
        const requested = args.data.id_client;
        if (requested !== undefined && requested !== null) {
            if (!authIsAdmin) {
                throw new ActionNotAllowedException('Solo un administrador puede crear usuarios de otro cliente');
            }
            id_client = BigInt(requested);
        }
        else if (!authIsAdmin && auth !== null && auth !== undefined) {
            id_client = BigInt(auth.id_user);
        }

        const created = await this._usersRepository.create({
            id_client,
            id_type: args.data.id_type,
            id_number: args.data.id_number,
            first_name: args.data.first_name,
            second_name: args.data.second_name,
            first_surname: args.data.first_surname,
            second_surname: args.data.second_surname,
            email: args.data.email,
            cell_callsign: args.data.cell_callsign,
            cell_phone: args.data.cell_phone,
            birthdate: args.data.birthdate ? new Date(args.data.birthdate) : null,
            state: true,
        });

        return UserMapper.mapUser(created);
    };
}
