import { ClientCredentials } from "src/core/domain/entities/client_credentials.entity";
import { IBaseRepository } from "./base.repository";

export const CLIENT_CREDENTIALS_REPOSITORY = Symbol("IClientCredentialsRepository");

export interface IClientCredentialsRepository extends IBaseRepository<ClientCredentials, 'id_client_credential'> {

    findByClientId(id: bigint): Promise<Nullable<ClientCredentials>>;

    findByClientByUsername(username: string): Promise<Nullable<ClientCredentials>>;
}