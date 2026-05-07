import { Module } from '@nestjs/common';
import { RepositoriesModule } from 'src/infrastructure/repositories/repositories.module';
import { HelpersModule } from 'src/infrastructure/helpers/helpers.module';
import { ADMIN_USER_REPOSITORY } from 'src/core/application/contracts/persistence';
import { ENCRYPTER, HASH_GENERATOR, JWT_GENERATOR } from 'src/core/application/contracts/infrastructure';
import { AuthAdminUserUseCase } from 'src/core/application/use-cases/admin-user/auth/auth-admin-user.usecase';
import { AdminUserController } from './admin-user.controller';

@Module({
    imports: [RepositoriesModule, HelpersModule],
    controllers: [AdminUserController],
    providers: [
        {
            provide: AuthAdminUserUseCase,
            useFactory: (repo, hashGen, jwtGen, encrypterGen) =>
                new AuthAdminUserUseCase(repo, hashGen, jwtGen, encrypterGen),
            inject: [ADMIN_USER_REPOSITORY, HASH_GENERATOR, JWT_GENERATOR, ENCRYPTER],
        },
    ],
})
export class AdminUserModule { }
