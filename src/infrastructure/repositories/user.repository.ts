import { Injectable } from '@nestjs/common';
import type { users } from '@prisma/client';
import type { IUserRepository } from '../../core/application/contracts/persistence/user-repository.contract';
import type { PrismaService } from '../prisma/prisma.service';
import { AsyncRepository } from './async.repository';

@Injectable()
export class UserRepository extends AsyncRepository<users, bigint> implements IUserRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'users', 'id_user');
    }
}
