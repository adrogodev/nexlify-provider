import type { IAppConfig } from "src/core/application/contracts/infrastructure";
import { IEncrypter, IHashGenerator, IJwtGenerator } from "src/core/application/contracts/infrastructure";
import { IClientCredentialsRepository, IClientRepository, INexlifyKeysLogsRepository, INexlifyKeysRepository } from "src/core/application/contracts/persistence";
import { Client } from "src/core/domain/entities/client.entity";
import { ClientCredentials } from "src/core/domain/entities/client_credentials.entity";
import { ActionNotAllowedException, NotFoundException } from "src/core/domain/exceptions";
import { TokenInfo, UseCase, UseCaseArgs } from "src/core/domain/models";
import { normalizeToken } from "src/core/application/tools/normalize.tool";
import { AssignCredentialsInput } from "./assign-credentials.request-data";
import { ClientStateEnum } from "src/core/domain/enum";


export class AssignCredentialsUseCase implements UseCase<AssignCredentialsInput, boolean> {
    constructor(
        private readonly _clientRepository: IClientRepository,
        private readonly _clientCredentialsRepository: IClientCredentialsRepository,
        private readonly _nexlifyKey: INexlifyKeysRepository,
        private readonly _nexlifyKeyLog: INexlifyKeysLogsRepository,
        private readonly _jwt: IJwtGenerator,
        private readonly _encryptor: IEncrypter,
        private readonly _hash: IHashGenerator,
        private readonly _appConfig: IAppConfig,
    ) { }

    public run = async (args: UseCaseArgs<AssignCredentialsInput>): Promise<boolean> => {
        const { ...values } = args.data;

        const token = normalizeToken(values.assign_creds_token);

        const decryptedToken = this._encryptor.decrypt(token, this._appConfig.ENCRYPT_KEY);
        const assignCredetialsToken = this._jwt.getDataToken<TokenInfo>(decryptedToken, this._appConfig.JWT_SECRET_KEY);

        const { id_user } = assignCredetialsToken.data!.payload;

        const client: Nullable<Client> = await this._clientRepository.getByIdAsync(BigInt(id_user));

        if (client === null) throw new NotFoundException('Cliente para la asignación de credenciales de acceso no encontrado');
        const client_credentials: Nullable<ClientCredentials> = await this._clientCredentialsRepository.findByClientId(client.id_client);

        if (client_credentials!.checked_credential_assignment_token !== true) throw new ActionNotAllowedException('Verifica el token de asignacion de credenciales e intentalo nuevamente');

        //Se activa el cliente
        client.id_client_state = ClientStateEnum.ACTIVO;
        await this._clientRepository.update(client.id_client, client);


        //Se registar las credenciales de acceso para el cliente
        client_credentials!.username = values.username;
        client_credentials!.password = this._hash.SHA256(values.password);

        await this._clientCredentialsRepository.update(client_credentials!.id_client_credential, client_credentials!);

        //Genera api-key para el cliente
        const clientApiKey = `NexlifyApiKey${client.id_client}${new Date().toISOString()}`

        await this._nexlifyKey.create({
            id_client: client.id_client,
            api_key: this._hash.SHA256(clientApiKey),
            state: true
        });

        await this._nexlifyKeyLog.create({
            id_client: client.id_client,
            api_key: this._hash.SHA256(clientApiKey),
        });

        return true;
    };
}