import type { clients } from "@prisma/client";
import { IBaseRepository } from "./base.repository";

export const CLIENT_REPOSITORY = Symbol('IClientRepository');

export interface IClientRepository extends IBaseRepository<clients, 'id_client'> { }