import type { IAppConfig, IEncrypter, IHashGenerator, IJwtGenerator } from 'src/core/application/contracts/infrastructure';
import type { IAdminUserRepository } from 'src/core/application/contracts/persistence';
import { AuthDto } from 'src/core/application/dtos';
import { UnauthorizedException } from 'src/core/domain/exceptions';
import { TokenInfo } from 'src/core/domain/models';
import type { UseCase, UseCaseArgs } from 'src/core/domain/models/use-case.model';
import type { AuthAdminUserInput } from './auth-admin-user.request-data';

export class AuthAdminUserUseCase implements UseCase<AuthAdminUserInput, AuthDto> {
    constructor(
        private readonly _adminUserRepository: IAdminUserRepository,
        private readonly _hashGenerator: IHashGenerator,
        private readonly _jwt: IJwtGenerator,
        private readonly _encrypter: IEncrypter,
        private readonly _appConfig: IAppConfig,
    ) { }

    public run = async (args: UseCaseArgs<AuthAdminUserInput>): Promise<AuthDto> => {
        const { username, password, ip_connection } = args.data;

        const user = await this._adminUserRepository.findByUsername(username);
        if (!user) throw new UnauthorizedException("Credenciales invalidas");;

        const hashedInput = this._hashGenerator.SHA256(password);
        if (hashedInput !== user.password) throw new UnauthorizedException("Credenciales invalidas");

        if (!user.is_active) throw new UnauthorizedException();

        const tokenInfo = TokenInfo.create({ jti: null, ip_connection, id_user: Number(user.id_user), is_admin: true });

        const authToken = this._jwt.createTokenWithExpiration({ data: tokenInfo, key: this._appConfig.JWT_SECRET_KEY, expiresIn: `${this._appConfig.JWT_EXPIRATION_TIME}h` });

        const tokenChiper = this._encrypter.encrypt(authToken, this._appConfig.ENCRYPT_KEY);

        user.ip_connection = ip_connection;
        user.auth_token = tokenChiper;
        user.updated_at = new Date();

        await this._adminUserRepository.update(user.id_user, user);

        return {
            ip_connection,
            token: authToken
        }

    };
}
