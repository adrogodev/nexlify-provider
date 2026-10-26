import { User } from 'src/core/domain/entities/user.entity';
import type { IBaseRepository } from './base.repository';

export const USERS_REPOSITORY = Symbol('IUsersRepository');

export interface GetUsersFilters {
    id_client?: bigint;
    page?: number;
    limit?: number;
}

export interface IUsersRepository extends IBaseRepository<User, 'id_user'> {
    getAllWithFilters(filters: GetUsersFilters): Promise<User[]>;
    countWithFilters(filters: GetUsersFilters): Promise<number>;
}
