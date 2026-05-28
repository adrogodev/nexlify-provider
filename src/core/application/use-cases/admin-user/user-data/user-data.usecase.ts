import type { IRequestContext } from 'src/core/application/contracts/infrastructure';
import type { IAdminUserRepository } from 'src/core/application/contracts/persistence';
import type { UserDataDTO } from 'src/core/application/dtos';
import { NotFoundException, UnauthorizedException } from 'src/core/domain/exceptions';
import type { UseCase, UseCaseArgs } from 'src/core/domain/models/use-case.model';

export class UserDataUseCase implements UseCase<null, UserDataDTO> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _adminUserRepository: IAdminUserRepository,
    ) { }

    public run = async (_args: UseCaseArgs<null>): Promise<UserDataDTO> => {
        const tokenInfo = this._context.get();

        const user = await this._adminUserRepository.getByIdAsync(BigInt(tokenInfo.id_user));
        if (!user) throw new NotFoundException('Usuario no encontrado');
        if (!user.is_active) throw new UnauthorizedException('Usuario inactivo');

        return {
            is_admin: tokenInfo.is_admin!,
            id: Number(user.id_user),
            name: `${user.name} ${user.surname}`,
            username: user.username,
            ip_connection: tokenInfo.ip_connection,
            is_active: user.is_active
        };
    };
}
