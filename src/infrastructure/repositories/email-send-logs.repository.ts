import { Injectable } from "@nestjs/common";
import { IEmailSendLogsRepository } from "src/core/application/contracts/persistence/email-send-logs.repository";
import { EmailSendLog } from "src/core/domain/entities/email-send-log.entity";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";

@Injectable()
export class EmailSendLogsRepository extends BaseRepository<EmailSendLog, 'id_log'> implements IEmailSendLogsRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'email_send_logs', 'id_log');
    }

    public async findByEmail(id_email: bigint): Promise<EmailSendLog[]> {
        return await this._model.findMany({
            where: { id_email },
            orderBy: [{ attempt: 'asc' }, { id_log: 'asc' }],
        });
    }
}
