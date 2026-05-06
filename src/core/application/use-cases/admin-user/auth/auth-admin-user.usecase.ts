import type { UseCase, UseCaseArgs } from 'src/core/domain/models/use-case.model';
import type { IAdminUserRepository } from 'src/core/application/contracts/persistence';
import type { IHashGenerator, IJwtGenerator } from 'src/core/application/contracts/infrastructure';
import type { AuthAdminUserRequestData } from './auth-admin-user.request-data';
import { AuthDto } from 'src/core/application/dtos';
import { UnauthenticatedException, UnauthorizedException } from 'src/core/domain/exceptions';

export class AuthAdminUserUseCase implements UseCase<AuthAdminUserRequestData, AuthDto> {
    constructor(
        private readonly _adminUserRepository: IAdminUserRepository,
        private readonly _hashGenerator: IHashGenerator,
        private readonly _jwtGenerator: IJwtGenerator,
    ) { }

    public run = async (args: UseCaseArgs<AuthAdminUserRequestData>): Promise<AuthDto> => {
        const { username, password } = args.data;

        const user = await this._adminUserRepository.findByUsername(username);
        if (!user || !user.is_active) throw new UnauthorizedException();

        const hashedInput = this._hashGenerator.SHA256(password);
        if (hashedInput !== user.password) throw new UnauthenticatedException("Credenciales invalidas");

        const token = this._jwtGenerator.createTokenWithExpiration(
            { sub: user.id_user.toString(), username: user.username },
            86400, // 24 horas
        );

        await this._adminUserRepository.updateAuthToken(user.id_user, token);

        return token;
    };
}
