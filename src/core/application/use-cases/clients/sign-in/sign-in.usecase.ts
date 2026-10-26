import type { IAppConfig } from "src/core/application/contracts/infrastructure";
import { IEncrypter, IPasswordHasher, IJwtGenerator } from "src/core/application/contracts/infrastructure";
import { IClientCredentialsRepository, IClientRepository } from "src/core/application/contracts/persistence";
import { AuthDto } from "src/core/application/dtos";
import { UnauthorizedException } from "src/core/domain/exceptions";
import { TokenInfo, UseCase, UseCaseArgs } from "src/core/domain/models";
import { SignInInput } from "./sign-in.request-data";
import { ClientStateEnum } from "src/core/domain/enum";

export class SignInUseCase implements UseCase<SignInInput, AuthDto> {
    constructor(
        private readonly _clientCredentialsRepository: IClientCredentialsRepository,
        private readonly _clientRepositoty: IClientRepository,
        private readonly _passwordHasher: IPasswordHasher,
        private readonly _jwt: IJwtGenerator,
        private readonly _encrypter: IEncrypter,
        private readonly _appConfig: IAppConfig,
    ) { }

    public run = async (args: UseCaseArgs<SignInInput>): Promise<AuthDto> => {
        const { username, password, ip_connection } = args.data;

        const clientCreds = await this._clientCredentialsRepository.findByClientByUsername(username);
        if (!clientCreds) throw new UnauthorizedException("Credenciales invalidas");;

        const isValidPassword = await this._passwordHasher.verify(password, clientCreds.password ?? '');
        if (!isValidPassword) throw new UnauthorizedException("Credenciales invalidas");

        // Upgrade legacy unsalted SHA-256 hashes to bcrypt on successful login.
        if (!this._passwordHasher.isBcryptHash(clientCreds.password ?? '')) {
            clientCreds.password = await this._passwordHasher.hash(password);
        }

        const client = await this._clientRepositoty.getByIdAsync(BigInt(clientCreds.id_client!));

        if (client?.id_client_state !== ClientStateEnum.ACTIVO) throw new UnauthorizedException();

        const tokenInfo = TokenInfo.create({ jti: null, ip_connection, id_user: Number(client.id_client), is_admin: false });

        const authToken = this._jwt.createTokenWithExpiration({ data: tokenInfo, key: this._appConfig.JWT_SECRET_KEY, expiresIn: `${this._appConfig.JWT_EXPIRATION_TIME}h` });

        const tokenChiper = this._encrypter.encrypt(authToken, this._appConfig.ENCRYPT_KEY);

        clientCreds.ip_connection = ip_connection;
        clientCreds.auth_token = tokenChiper;
        clientCreds.updated_at = new Date();

        await this._clientCredentialsRepository.update(clientCreds.id_client_credential, clientCreds);

        return {
            ip_connection,
            token: authToken
        }
    };
}