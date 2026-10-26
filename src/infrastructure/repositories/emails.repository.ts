import { Injectable } from "@nestjs/common";
import { GetEmailsFilters, IEmailsRepository } from "src/core/application/contracts/persistence/emails.repository";
import { Email } from "src/core/domain/entities/email.entity";
import { EmailStateEnum } from "src/core/domain/enum";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";

const SHORT_CODE_MAX = 20;

@Injectable()
export class EmailsRepository extends BaseRepository<Email, 'id_email'> implements IEmailsRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'emails', 'id_email');
    }

    public async findByUuidOrShortCode(identifier: string): Promise<Email | null> {
        return await this._model.findFirst({
            where: {
                OR: [
                    { email_uuid: identifier },
                    { short_code: identifier },
                ],
            },
        });
    }

    public async findRetryable(nextRetryBefore: Date): Promise<Email[]> {
        return await this._model.findMany({
            where: {
                state: EmailStateEnum.RETRYING,
                next_retry_at: { lte: nextRetryBefore },
            },
            orderBy: { next_retry_at: 'asc' },
        });
    }

    public async countSentOn(from: Date, to: Date): Promise<number> {
        return await this._model.count({
            where: {
                state: { in: [EmailStateEnum.SENT, EmailStateEnum.WARNING] },
                sent_at: { gte: from, lte: to },
            },
        });
    }

    public async getAllWithFilters(filters: GetEmailsFilters): Promise<Email[]> {
        const page = Math.max(1, filters.page ?? 1);
        const limit = Math.min(100, Math.max(1, filters.limit ?? 20));

        return await this._model.findMany({
            where: {
                state: filters.state,
                id_client: filters.id_client,
                short_code: filters.short_code,
                created_at: (filters.from_date || filters.to_date)
                    ? {
                        gte: filters.from_date,
                        lte: filters.to_date,
                    }
                    : undefined,
            },
            orderBy: { id_email: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });
    }
}
