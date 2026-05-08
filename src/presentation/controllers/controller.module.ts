import { Module } from "@nestjs/common";
import { ENCRYPTER, HASH_GENERATOR, JWT_GENERATOR } from "src/core/application/contracts/infrastructure";
import { ADMIN_USER_REPOSITORY, CLIENT_REPOSITORY, SMTP_SERVER_REPOSITORY } from "src/core/application/contracts/persistence";
import { AuthAdminUserUseCase } from "src/core/application/use-cases/admin-user";
import { RegisterClientUseCase } from "src/core/application/use-cases/clients";
import { AddSmtpServerUseCase } from "src/core/application/use-cases/smtp-server";
import { HelpersModule } from "src/infrastructure/helpers/helpers.module";
import { RepositoriesModule } from "src/infrastructure/repositories/repositories.module";
import { SecurityModule } from "src/infrastructure/security";
import { AdminUserController } from "./admin-user.controller";
import { ClientContoller } from "./register-client.controller";
import { SmtpServerController } from "./smtp-server.controller";

@Module({
    imports: [RepositoriesModule, HelpersModule, SecurityModule],
    controllers: [
        AdminUserController,
        ClientContoller,
        SmtpServerController
    ],
    providers: [
        {
            provide: RegisterClientUseCase,
            useFactory: (repo) => new RegisterClientUseCase(repo),
            inject: [CLIENT_REPOSITORY]
        },
        {
            provide: AuthAdminUserUseCase,
            useFactory: (repo, hashGen, jwtGen, encrypterGen) => new AuthAdminUserUseCase(repo, hashGen, jwtGen, encrypterGen),
            inject: [ADMIN_USER_REPOSITORY, HASH_GENERATOR, JWT_GENERATOR, ENCRYPTER],
        },
        {
            provide: AddSmtpServerUseCase,
            useFactory: (repo) => new AddSmtpServerUseCase(repo),
            inject: [SMTP_SERVER_REPOSITORY]

        }
    ]
})

export class ControllerModule { }