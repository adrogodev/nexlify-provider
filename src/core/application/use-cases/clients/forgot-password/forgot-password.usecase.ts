import { randomUUID } from "node:crypto";
import type { IAppConfig, IEncrypter, IJwtGenerator } from "src/core/application/contracts/infrastructure";
import type { IClientCredentialsRepository, IClientRepository, INexlifyConfigurationRepository, ISmtpServerRepository } from "src/core/application/contracts/persistence";
import type { IMailerService, MailerPayload } from "src/core/application/contracts/services";
import { TokenInfo, UseCase, UseCaseArgs } from "src/core/domain/models";
import { ForgotPasswordInput } from "./forgot-password.request-data";

/** Short window for the recovery JWT; independent from the session token expiration. */
const RECOVERY_TOKEN_EXPIRATION = '30m';

export class ForgotPasswordUseCase implements UseCase<ForgotPasswordInput, boolean> {
    constructor(
        private readonly _clientCredentialsRepository: IClientCredentialsRepository,
        private readonly _clientRepository: IClientRepository,
        private readonly _jwt: IJwtGenerator,
        private readonly _encrypter: IEncrypter,
        private readonly _nexlifyConfigurationRepository: INexlifyConfigurationRepository,
        private readonly _smtpServerRepository: ISmtpServerRepository,
        private readonly _mailerService: IMailerService,
        private readonly _appConfig: IAppConfig,
    ) { }

    public run = async (args: UseCaseArgs<ForgotPasswordInput>): Promise<boolean> => {
        // Never supplied from the request context: this endpoint is public.
        const { username } = args.data;

        const clientCreds = await this._clientCredentialsRepository.findByClientByUsername(username);
        if (!clientCreds) return false;

        // jti is a plain string column: code-level uuid here is allowed by the feature spec.
        const jti = randomUUID();
        const recoveryTokenInfo = TokenInfo.create({ jti, ip_connection: null, id_user: Number(clientCreds.id_client), is_admin: false });
        const recoveryJwt = this._jwt.createTokenWithExpiration({ data: recoveryTokenInfo, key: this._appConfig.JWT_SECRET_KEY, expiresIn: RECOVERY_TOKEN_EXPIRATION });
        const recoveryTokenChip = this._encrypter.encrypt(recoveryJwt, this._appConfig.ENCRYPT_KEY);

        clientCreds.recovery_token = recoveryTokenChip;
        await this._clientCredentialsRepository.update(clientCreds.id_client_credential, clientCreds);

        const client = await this._clientRepository.getByIdAsync(BigInt(clientCreds.id_client));
        const configuration = await this._nexlifyConfigurationRepository.findConfiguration();
        const smtp = await this._smtpServerRepository.getByIdAsync(configuration?.id_smtp_server!);

        const resetLink = `${this._appConfig.PLATFORM_URL}/reset-password?token=${encodeURIComponent(recoveryTokenChip)}`;

        const mailerPayload: MailerPayload = {
            transporter: {
                host: smtp?.host ?? '',
                port: smtp?.port ?? 587,
                secure: smtp?.port === 465,
                user: configuration?.sender_email!,
                password: configuration?.mail_application_password ?? ''
            },
            email: {
                from: configuration?.sender_email!,
                to: client?.email ?? '',
                subject: 'Recuperación de contraseña',
                html: [
                    '<p>Se solicito un cambio de contraseña para tu cuenta.</p>',
                    `<p>Ingresa al siguiente enlace para restablecerla (expira en 30 minutos):</p>`,
                    `<p><a href="${resetLink}">${resetLink}</a></p>`,
                    '<p>Si no fuiste tu, ignora este correo.</p>'
                ].join('\n')
            }
        };

        await this._mailerService.send(mailerPayload);

        return true;
    };
}
