import { Module } from "@nestjs/common";
import { RepositoriesModule } from "src/infrastructure/repositories/repositories.module";
import { SecurityModule } from "src/infrastructure/security";
import { ClientContoller } from "./register-client.controller";
import { RegisterClientUseCase } from "src/core/application/use-cases/clients/register-client";
import { CLIENT_REPOSITORY } from "src/core/application/contracts/persistence";

@Module({
    imports: [RepositoriesModule, SecurityModule],
    controllers: [ClientContoller],
    providers: [
        {
            provide: RegisterClientUseCase,
            useFactory: (repo) => new RegisterClientUseCase(repo),
            inject: [CLIENT_REPOSITORY]
        }
    ]
})

export class ClientModule { }