import { Injectable } from '@nestjs/common';
import type { admin_user } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { IAdminUserRepository } from '../../core/application/contracts/persistence/admin-user.repository';
import { BaseRepository } from './base.repository';

@Injectable()
export class AdminUserRepository extends BaseRepository<admin_user, bigint> implements IAdminUserRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'admin_user', 'id_user');
    }

    async findByUsername(username: string): Promise<admin_user | null> {
        return await this._model.findFirst({ where: { username } });
    }

    async updateAuthToken(id: bigint, token: string): Promise<void> {
        await this._model.update({
            where: { id_user: id },
            data: { auth_token: token, updated_at: new Date() },
        });
    }
}