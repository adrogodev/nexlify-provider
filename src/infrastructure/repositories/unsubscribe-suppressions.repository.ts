import { Injectable } from '@nestjs/common';
import { SuppressionReason } from '@prisma/client';
import type { IUnsubscribeSuppressionsRepository } from 'src/core/application/contracts/persistence/unsubscribe-suppressions.repository';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Minimal writer over `suppressions` for AI-detected unsubscribe requests
 * (S8). Dedupe is per client + case-insensitive email, compatible with the
 * full suppression feature that owns the table's CRUD.
 */
@Injectable()
export class UnsubscribeSuppressionsRepository
    implements IUnsubscribeSuppressionsRepository
{
    constructor(private readonly prisma: PrismaService) {}

    public async addUnsubscribe(args: {
        id_client: bigint | null;
        email: string;
        source_email_id: bigint;
        details: string | null;
    }): Promise<boolean> {
        const email = args.email.trim().toLowerCase();
        const existing = await this.prisma.suppressions.findFirst({
            where: {
                id_client: args.id_client,
                email: { equals: email, mode: 'insensitive' },
            },
            select: { id_suppression: true },
        });
        if (existing !== null) {
            return false;
        }
        await this.prisma.suppressions.create({
            data: {
                id_client: args.id_client,
                email,
                reason: SuppressionReason.UNSUBSCRIBE,
                source_email_id: args.source_email_id,
                details:
                    args.details === null ? null : args.details.slice(0, 500),
            },
        });
        return true;
    }
}
