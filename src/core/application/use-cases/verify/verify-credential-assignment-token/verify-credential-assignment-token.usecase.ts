import { IEncrypter, IJwtGenerator } from "src/core/application/contracts/infrastructure";
import { IClientCredentialsRepository } from "src/core/application/contracts/persistence";
import { ClientCredentials } from "src/core/domain/entities/client_credentials.entity";
import { NotFoundException, ValidationException } from "src/core/domain/exceptions";
import { TokenInfo, UseCase, UseCaseArgs } from "src/core/domain/models";
import { AppEnvs as _env } from "src/infrastructure/environments/app-env.config";
import { normalizeToken } from "src/infrastructure/tools/normalize.tool";

export class VerifyCredentialAssignmentTokenUseCase implements UseCase<{ token: unknown }, void> {
    constructor(
        private readonly _clientCredentialsRepository: IClientCredentialsRepository,
        private readonly _jwt: IJwtGenerator,
        private readonly _encryptor: IEncrypter,
    ) { }

    public run = async (args: UseCaseArgs<{ token: string; }>): Promise<void> => {
        const { token } = args.data;

        const normalizedToken = normalizeToken(token);
        let assignCredetialsTokenInfo: TokenInfo | null | undefined;

        try {
            const decryptedToken = this._encryptor.decrypt(normalizedToken, _env.ENCRYPT_KEY);
            const assignCredetialsToken = this._jwt.getDataToken<TokenInfo>(decryptedToken, _env.JWT_SECRET_KEY);
            assignCredetialsTokenInfo = assignCredetialsToken.data?.payload;

            if (assignCredetialsToken.isNotValid || assignCredetialsToken.isExpired || !assignCredetialsTokenInfo?.jti) {
                throw new ValidationException({ token: ['Token de asignación de credeciales invalido'] });
            }
        } catch (error) {
            if (error instanceof ValidationException) throw error;
            throw new ValidationException({ token: ['Token de asignación de credeciales invalido'] });
        }

        const { jti } = assignCredetialsTokenInfo;
        const client_credentials: Nullable<ClientCredentials> = await this._clientCredentialsRepository.findByTokenJTI(jti!);

        if (client_credentials === null) throw new NotFoundException('No se ha encontrado registro con el jti obtenido')

        client_credentials.assign_credentials_token_jti = null;

        await this._clientCredentialsRepository.update(client_credentials.id_client_credential, client_credentials);

    };
}
