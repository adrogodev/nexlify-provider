import { IdType } from 'src/core/domain/entities/id-type.entity';
import type { IBaseRepository } from './base.repository';

export const ID_TYPE_REPOSITORY = Symbol('IIdTypeRepository');

export interface IIdTypeRepository extends IBaseRepository<IdType, 'id_type'> { }
