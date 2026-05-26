import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { IAdminUserRepository } from '../../core/application/contracts/persistence/admin-user.repository';
import { BaseRepository } from './base.repository';
import { AdminUser } from 'src/core/domain/entities/admin-user.entity';

@Injectable()
export class AdminUserRepository extends BaseRepository<AdminUser, 'id_user'> implements IAdminUserRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'admin_user', 'id_user');
    }

    async findByUsername(username: string): Promise<AdminUser | null> {
        return await this._model.findFirst({ where: { username } });
    }
}