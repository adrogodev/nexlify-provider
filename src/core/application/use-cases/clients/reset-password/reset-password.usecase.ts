import type { IAppConfig, IEncrypter, IJwtGenerator, IPasswordHasher } from "src/core/application/contracts/infrastructure";
import type { IClientCredentialsRepository } from "src/core/application/contracts/persistence";
import { UnauthorizedException } from "src/core/domain/exceptions";
import type { TokenInfo } from "src/core/domain/models";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { ResetPasswordInput } from "./reset-password.request-data";

export class ResetPasswordUseCase implements UseCase<ResetPasswordInput, boolean> {
    constructor(
        private readonly _encrypter: IEncrypter,
        private readonly _jwt: IJwtGenerator,
        private readonly _passwordHasher: IPasswordHasher,
        private readonly _clientCredentialsRepository: IClientCredentialsRepository,
        private readonly _appConfig: IAppConfig,
    ) { }

    public run = async (args: UseCaseArgs<ResetPasswordInput>): Promise<boolean> => {
        let recoveryTokenInfo: TokenInfo | null | undefined;

        try {
            const recoveryJwt = this._encrypter.decrypt(args.data.recovery_token, this._appConfig.ENCRYPT_KEY);
            const recoveryToken = this._jwt.getDataToken<TokenInfo>(recoveryJwt, this._appConfig.JWT_SECRET_KEY);
            recoveryTokenInfo = recoveryToken.data?.payload;

            if (recoveryToken.isNotValid || recoveryToken.isExpired || !recoveryTokenInfo?.id_user) {
                throw new UnauthorizedException();
            }
        } catch (error) {
            if (error instanceof UnauthorizedException) throw error;
            throw new UnauthorizedException('Token de recuperacion invalido o ya utilizado');
        }

        const credentials = await this._clientCredentialsRepository.findByClientId(BigInt(recoveryTokenInfo.id_user));
        if (!credentials) throw new UnauthorizedException('Token de recuperacion invalido o ya utilizado');

        // Single use: the stored token must match the provided one EXACTLY.
        if (credentials.recovery_token !== args.data.recovery_token) {
            throw new UnauthorizedException('Token de recuperacion invalido o ya utilizado');
        }

        credentials.password = await this._passwordHasher.hash(args.data.password);
        credentials.recovery_token = null;

        await this._clientCredentialsRepository.update(credentials.id_client_credential, credentials);

        return true;
    };
}
