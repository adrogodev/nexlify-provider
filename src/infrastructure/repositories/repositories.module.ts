import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '../../core/application/contracts/persistence/user-repository.contract';
import { UserRepository } from './user.repository';

@Module({
    providers: [
        {
            provide: USER_REPOSITORY,
            useClass: UserRepository,
        },
    ],
    exports: [USER_REPOSITORY],
})
export class RepositoriesModule {}
