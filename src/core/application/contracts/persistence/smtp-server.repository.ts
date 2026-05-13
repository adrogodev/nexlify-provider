import { smtp_servers } from "@prisma/client";
import { IBaseRepository } from "./base.repository";

export const SMTP_SERVER_REPOSITORY = Symbol('ISmtpServerRepository');

export interface ISmtpServerRepository extends IBaseRepository<smtp_servers, 'id_smpt_server'> {
    findByNameAndProvider(name: string, provider: string): Promise<smtp_servers | null>;
}