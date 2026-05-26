import { Client } from "src/core/domain/entities/client.entity";
import { IBaseRepository } from "./base.repository";

export const CLIENT_REPOSITORY = Symbol('IClientRepository');

export interface IClientRepository extends IBaseRepository<Client, 'id_client'> { }