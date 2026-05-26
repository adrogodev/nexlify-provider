import { IEncrypter, IHashGenerator, IJwtGenerator } from "src/core/application/contracts/infrastructure";
import { IClientCredentialsRepository, IClientRepository } from "src/core/application/contracts/persistence";
import { AuthDto } from "src/core/application/dtos";
import { UserState } from "src/core/domain/enum/user-state";
import { UnauthorizedException } from "src/core/domain/exceptions";
import { TokenInfo, UseCase, UseCaseArgs } from "src/core/domain/models";
import { AppEnvs as _env } from "src/infrastructure/environments/app-env.config";
import { SignInInput } from "./sign-in.request-data";

export class SignInUseCase implements UseCase<SignInInput, AuthDto> {
    constructor(
        private readonly _clientCredentialsRepository: IClientCredentialsRepository,
        private readonly _clientRepositoty: IClientRepository,
        private readonly _hashGenerator: IHashGenerator,
        private readonly _jwt: IJwtGenerator,
        private readonly _encrypter: IEncrypter
    ) { }

    public run = async (args: UseCaseArgs<SignInInput>): Promise<AuthDto> => {
        const { username, password, ip_connection } = args.data;

        const clientCreds = await this._clientCredentialsRepository.findByClientByUsername(username);
        if (!clientCreds) throw new UnauthorizedException("Credenciales invalidas");;

        const hashedInput = this._hashGenerator.SHA256(password);
        if (hashedInput !== clientCreds.password) throw new UnauthorizedException("Credenciales invalidas");

        const client = await this._clientRepositoty.getByIdAsync(BigInt(clientCreds.id_client!));

        if (client?.id_state !== UserState.ACTIVO) throw new UnauthorizedException();

        const tokenInfo = TokenInfo.create({ jti: null, ip_connection, id_user: Number(client.id_client), admin: false });

        const authToken = this._jwt.createTokenWithExpiration({ data: tokenInfo, key: _env.JWT_SECRET_KEY, expiresIn: `${_env.JWT_EXPIRATION_TIME}h` });

        const tokenChiper = this._encrypter.encrypt(authToken, _env.ENCRYPT_KEY);

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