import type { admin_user } from '@prisma/client';
import type { IBaseRepository } from './base.repository';

export const ADMIN_USER_REPOSITORY = Symbol('IAdminUserRepository');

export interface IAdminUserRepository extends IBaseRepository<admin_user, 'id_user'> {
    findByUsername(username: string): Promise<admin_user | null>;
}
