import type { IAppConfig } from "src/core/application/contracts/infrastructure";
import { IEncrypter, IJwtGenerator } from "src/core/application/contracts/infrastructure";
import { IClientCredentialsRepository } from "src/core/application/contracts/persistence";
import { ClientCredentials } from "src/core/domain/entities/client_credentials.entity";
import { ActionNotAllowedException, NotFoundException, NotMatchException, ValidationException } from "src/core/domain/exceptions";
import { TokenInfo, UseCase, UseCaseArgs } from "src/core/domain/models";
import { normalizeToken } from "src/core/application/tools/normalize.tool";

export class VerifyCredentialAssignmentTokenUseCase implements UseCase<{ token: unknown }, void> {
    constructor(
        private readonly _clientCredentialsRepository: IClientCredentialsRepository,
        private readonly _jwt: IJwtGenerator,
        private readonly _encryptor: IEncrypter,
        private readonly _appConfig: IAppConfig,
    ) { }

    public run = async (args: UseCaseArgs<{ token: string; }>): Promise<void> => {
        const { token } = args.data;

        const normalizedToken = normalizeToken(token);
        let assignCredetialsTokenInfo: TokenInfo | null | undefined;

        try {
            const decryptedToken = this._encryptor.decrypt(normalizedToken, this._appConfig.ENCRYPT_KEY);
            const assignCredetialsToken = this._jwt.getDataToken<TokenInfo>(decryptedToken, this._appConfig.JWT_SECRET_KEY);
            assignCredetialsTokenInfo = assignCredetialsToken.data?.payload;

            if (assignCredetialsToken.isNotValid || assignCredetialsToken.isExpired || !assignCredetialsTokenInfo?.jti) {
                throw new ValidationException({ token: ['Token de asignación de credeciales invalido'] });
            }
        } catch (error) {
            if (error instanceof ValidationException) throw error;
            throw new ValidationException({ token: ['Token de asignación de credeciales invalido'] });
        }

        const { id_user, jti } = assignCredetialsTokenInfo;

        const client_credentials: Nullable<ClientCredentials> = await this._clientCredentialsRepository.findByClientId(BigInt(id_user)!);

        if (client_credentials?.checked_credential_assignment_token === true) throw new ActionNotAllowedException('Este token de asignacion ya ha sido validado')

        if (client_credentials?.assign_credentials_token_jti !== jti) throw new NotMatchException('El jti del token no coicidiente con el cliente')

        client_credentials.checked_credential_assignment_token = true;

        await this._clientCredentialsRepository.update(client_credentials.id_client_credential, client_credentials);

    };
}
