import { AdminUser } from 'src/core/domain/entities/admin-user.entity';
import type { IBaseRepository } from './base.repository';

export const ADMIN_USER_REPOSITORY = Symbol('IAdminUserRepository');

export interface IAdminUserRepository extends IBaseRepository<AdminUser, 'id_user'> {
    findByUsername(username: string): Promise<AdminUser | null>;
}
