import { Injectable } from "@nestjs/common";
import { smtp_servers } from "@prisma/client";
import { ISmtpServerRepository } from "src/core/application/contracts/persistence/smtp-server.repository";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";

@Injectable()
export class SmtpServerRepository extends BaseRepository<smtp_servers, 'id_smpt_server'> implements ISmtpServerRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'smtp_servers', 'id_smpt_server');
    }
}