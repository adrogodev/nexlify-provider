import { Injectable } from "@nestjs/common";
import type { IEmailAttachmentsRepository } from "src/core/application/contracts/persistence/email-attachments.repository";
import { EmailAttachment } from "src/core/domain/entities/email-attachment.entity";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";

@Injectable()
export class EmailAttachmentsRepository extends BaseRepository<EmailAttachment, 'id_attachment'> implements IEmailAttachmentsRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'email_attachments', 'id_attachment');
    }

    public async findByEmail(id_email: bigint): Promise<EmailAttachment[]> {
        return await this._model.findMany({
            where: this.#buildByEmail(id_email),
            orderBy: { id_attachment: 'asc' },
        });
    }

    #buildByEmail(id_email: bigint): Record<string, unknown> {
        return { id_email };
    }
}
