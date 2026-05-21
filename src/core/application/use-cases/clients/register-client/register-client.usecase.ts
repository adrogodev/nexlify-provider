import { IEncrypter, IJwtGenerator } from "src/core/application/contracts/infrastructure";
import { IClientCredentialsRepository, IClientRepository, INexlifyConfigurationRepository, ISmtpServerRepository } from "src/core/application/contracts/persistence";
import { UserState } from "src/core/domain/enum/user-state";
import { TokenInfo, UseCase, UseCaseArgs } from "src/core/domain/models";
import { AppEnvs as _env } from "src/infrastructure/environments/app-env.config";
import { v4 as uuidv4 } from "uuid";
import { RegisterClientInput, RegisterClientRequestData } from "./register-client.request-data";
import { ITemplateService } from "src/core/application/contracts/services/template.service";
import { IMailerService, MailerPayload } from "src/core/application/contracts/services";
import { NexlifyConfiguration } from "src/core/domain/entities/nexlify-configuration.entity";

export class RegisterClientUseCase implements UseCase<RegisterClientInput, boolean> {
    constructor(
        private readonly _clientRepository: IClientRepository,
        private readonly _clientCredentialsRepository: IClientCredentialsRepository,
        private readonly _jwt: IJwtGenerator,
        private readonly _encryptor: IEncrypter,
        private readonly _nexlifyConfigurationRepository: INexlifyConfigurationRepository,
        private readonly _smtpServerRepository: ISmtpServerRepository,
        private readonly _templateServices: ITemplateService,
        private readonly _mailerService: IMailerService
    ) { }

    public run = async (args: UseCaseArgs<RegisterClientRequestData>): Promise<boolean> => {
        const { ...values } = args.data;

        const newClient = await this._clientRepository.create({
            id_state: UserState.ACTIVO,
            id_type: values.id_type,
            id_number: values.id_number,
            name: values.name,
            email: values.email,
            cell_callsign: values.cell_callsign,
            cell_phone: values.cell_phone,
            user_first_name: values.user_first_name,
            user_second_name: values.user_second_name || null,
            user_first_surname: values.user_first_surname,
            user_second_surname: values.user_second_surname || null
        })

        //Se genera el token y correo para asignacion de credenciales
        const jti_key = uuidv4();
        const assignCredetialsTokenInfo = TokenInfo.create({ jti: jti_key, ip_connection: null, id_user: Number(newClient.id_client) });
        const assignCredetialsToken = this._jwt.createTokenWithExpiration({ data: assignCredetialsTokenInfo, key: _env.JWT_SECRET_KEY, expiresIn: `${_env.JWT_EXPIRATION_TIME}` });
        const tokenChiper = this._encryptor.encrypt(assignCredetialsToken, _env.ENCRYPT_KEY);
        const assign_path: string = `${_env.PLATFORM_URL}?token=${tokenChiper}`;


        //Construir y enviar correo electronico
        const configuration: Nullable<NexlifyConfiguration> = await this._nexlifyConfigurationRepository.findConfiguration();
        const smpt = await this._smtpServerRepository.getByIdAsync(configuration?.id_smtp_server!);

        const support_email = configuration?.reply_to_email !== null ? configuration!.reply_to_email : configuration.sender_email;
        const assignClientCredentialsTemplate: Nullable<string> = await this._templateServices.assignClientCredentials(newClient.name!, assign_path, support_email);

        const mailerPayload: MailerPayload = {
            transporter: {
                host: smpt?.host!,
                port: smpt?.port!,
                secure: false,
                user: configuration?.sender_email!,
                password: configuration?.mail_application_password!
            },
            email: {
                from: configuration?.sender_email!,
                to: [values.email],
                subject: 'Asignación de credenciales',
                html: assignClientCredentialsTemplate!
            }
        }

        await this._mailerService.send(mailerPayload)

        await this._clientCredentialsRepository.create({
            id_client: newClient.id_client,
            username: null,
            password: null,
            ip_connection: null,
            assign_credentials_token_jti: jti_key,
            auth_token: null,
            recovery_token: null
        })

        return true;

    };
}
