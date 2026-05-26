import { SmtpServers } from "src/core/domain/entities/smtp-server.entity";
import { IBaseRepository } from "./base.repository";

export const SMTP_SERVER_REPOSITORY = Symbol('ISmtpServerRepository');

export interface ISmtpServerRepository extends IBaseRepository<SmtpServers, 'id_smpt_server'> {
    findByNameAndProvider(provider: string, host: string): Promise<SmtpServers | null>;
}