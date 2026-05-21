import { client_credentials } from "@prisma/client";
import { IBaseRepository } from "./base.repository";

export const CLIENT_CREDENTIALS_REPOSITORY = Symbol("IClientCredentialsRepository");

export interface IClientCredentialsRepository extends IBaseRepository<client_credentials, 'id_client_credential'> {
    findByTokenJTI(jti: string): Promise<Nullable<client_credentials>>;
}