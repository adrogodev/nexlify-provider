import { IEncrypter, IJwtGenerator } from "src/core/application/contracts/infrastructure";
import { IClientCredentialsRepository } from "src/core/application/contracts/persistence";
import { NotFoundException } from "src/core/domain/exceptions";
import { TokenInfo, UseCase, UseCaseArgs } from "src/core/domain/models";
import { AppEnvs as _env } from "src/infrastructure/environments/app-env.config";

export class VerifyCredentialAssignmentTokenUseCase implements UseCase<{ token: string }, void> {
    constructor(
        private readonly _clientCredentialsRepository: IClientCredentialsRepository,
        private readonly _jwt: IJwtGenerator,
        private readonly _encryptor: IEncrypter,
    ) { }

    public run = async (args: UseCaseArgs<{ token: string; }>): Promise<void> => {
        const { token } = args.data;

        const decryptedToken = this._encryptor.decrypt(token, _env.ENCRYPT_KEY);
        const assignCredetialsToken = this._jwt.getDataToken<TokenInfo>(decryptedToken, _env.JWT_SECRET_KEY);
        const assignCredetialsTokenInfo = assignCredetialsToken.data;

        const { jti } = assignCredetialsTokenInfo!.payload;
        const client_credentials = await this._clientCredentialsRepository.findByTokenJTI(jti!);

        if (client_credentials === null) throw new NotFoundException('No se ha encontrado registro con el jti obtenido')

        client_credentials.assign_credentials_token_jti = null;

        await this._clientCredentialsRepository.update(client_credentials.id_client_credential, client_credentials);

    };
}