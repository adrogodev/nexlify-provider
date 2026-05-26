import { Injectable } from "@nestjs/common";
import { ISmtpServerRepository } from "src/core/application/contracts/persistence/smtp-server.repository";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";
import { SmtpServers } from "src/core/domain/entities/smtp-server.entity";

@Injectable()
export class SmtpServerRepository extends BaseRepository<SmtpServers, 'id_smpt_server'> implements ISmtpServerRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'smtp_servers', 'id_smpt_server');
    }

    public async findByNameAndProvider(provider: string, host: string): Promise<SmtpServers | null> {
        return await this._model.findFirst({ where: { provider, host } });
    }
}