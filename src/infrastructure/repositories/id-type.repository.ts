import { Injectable } from '@nestjs/common';
import type { IIdTypeRepository } from 'src/core/application/contracts/persistence/id-type.repository';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from './base.repository';
import { IdType } from 'src/core/domain/entities/id-type.entity';

@Injectable()
export class IdTypeRepository extends BaseRepository<IdType, 'id_type'> implements IIdTypeRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'id_types', 'id_type');
    }
}
