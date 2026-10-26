import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import type { IUsersRepository } from "src/core/application/contracts/persistence";
import type { PaginateBaseDTO, UserInfoDTO } from "src/core/application/dtos";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { UserMapper } from "src/core/application/mappers";
import { GetUsersInput, toGetUsersFilters } from "./get-users.request-data";

export class GetUsersUseCase implements UseCase<GetUsersInput, PaginateBaseDTO<UserInfoDTO[]>> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _usersRepository: IUsersRepository,
    ) { }

    public run = async (args: UseCaseArgs<GetUsersInput>): Promise<PaginateBaseDTO<UserInfoDTO[]>> => {
        const auth = this._context.get();
        const authIsAdmin = auth?.is_admin === true;

        const filters = toGetUsersFilters(args.data);
        if (!authIsAdmin) filters.id_client = BigInt(auth.id_user);

        const [total_items, users] = await Promise.all([
            this._usersRepository.countWithFilters(filters),
            this._usersRepository.getAllWithFilters(filters),
        ]);

        return {
            total_items,
            page: Math.max(1, args.data?.page ?? 1),
            data: users.map((user) => UserMapper.mapUser(user)),
        };
    };
}
