import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { PaginateBaseDTO, UserInfoDTO } from "src/core/application/dtos";
import { CreateUserRequestData, CreateUserUseCase, GetUsersRequestData, GetUsersUseCase, UpdateUserRequestData, UpdateUserUseCase, UserIdParam } from "src/core/application/use-cases/users";
import { ClientResponse } from "src/core/domain/models";
import { AuthGuard } from "src/infrastructure/guards";
import { ContextInterceptor } from "src/infrastructure/interceptors/context.interceptor";

@UseGuards(AuthGuard)
@UseInterceptors(ContextInterceptor)
@Controller('api/users')
export class UsersController {
    constructor(
        private readonly _createUserUseCase: CreateUserUseCase,
        private readonly _getUsersUseCase: GetUsersUseCase,
        private readonly _updateUserUseCase: UpdateUserUseCase,
    ) { }

    @Post()
    @HttpCode(200)
    async create(@Body() body: CreateUserRequestData): Promise<ClientResponse<UserInfoDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Usuario creado exitosamente',
            data: await this._createUserUseCase.run({ data: { ...body } })
        });
    }

    @Get()
    @HttpCode(200)
    async list(@Query() query: GetUsersRequestData): Promise<ClientResponse<PaginateBaseDTO<UserInfoDTO[]>>> {
        return new ClientResponse({
            ok: true,
            message: 'Usuarios obtenidos con exito',
            data: await this._getUsersUseCase.run({ data: { ...query } })
        });
    }

    @Put(':id_user')
    @HttpCode(200)
    async update(@Param() param: UserIdParam, @Body() body: UpdateUserRequestData): Promise<ClientResponse<UserInfoDTO>> {
        return new ClientResponse({
            ok: true,
            message: 'Usuario actualizado exitosamente',
            data: await this._updateUserUseCase.run({ data: { id_user: BigInt(param.id_user), ...body } })
        });
    }
}
