import { Client } from "src/core/domain/entities/client.entity";
import { IBaseRepository } from "./base.repository";

export const CLIENT_REPOSITORY = Symbol('IClientRepository');

export interface IClientRepository extends IBaseRepository<Client, 'id_client'> {

    verifyIfExist(id_number: string): Promise<boolean>

    getAllClientByFilters(page: number, size: number, id_state: number, id_type: number, id_number: string, name: string): Promise<{ count: number, data: Client[] }>
}