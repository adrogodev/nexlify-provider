import type { users } from '@prisma/client';
import type { IAsyncRepository } from './async-repository.contract';

export const USER_REPOSITORY = Symbol('IUserRepository');

export interface IUserRepository extends IAsyncRepository<users, bigint> {}
