import { IRequestContext } from "src/core/application/contracts/infrastructure";
import { IClientCredentialsRepository, IClientRepository } from "src/core/application/contracts/persistence";
import { ClientDataDTO } from "src/core/application/dtos";
import { ClientStateEnum } from "src/core/domain/enum";
import { NotFoundException, UnauthorizedException } from "src/core/domain/exceptions";
import { UseCase, UseCaseArgs } from "src/core/domain/models";

export class ClientDataUseCase implements UseCase<null, ClientDataDTO> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _clientRepository: IClientRepository,
        private readonly _clientCredentialsRepository: IClientCredentialsRepository
    ) { }

    public run = async (_args: UseCaseArgs<null>): Promise<ClientDataDTO> => {
        const tokenInfo = this._context.get();

        const client = await this._clientRepository.getByIdAsync(BigInt(tokenInfo.id_user));
        const client_creds = await this._clientCredentialsRepository.findByClientId(client?.id_client!);
        if (!client) throw new NotFoundException('Usuario no encontrado');
        if (client.id_client_state !== ClientStateEnum.ACTIVO) throw new UnauthorizedException('Usuario no se encuentra activo');

        return {
            is_admin: tokenInfo.is_admin!,
            id: Number(client.id_client),
            name: `${client.user_first_name} ${client.user_first_surname}`,
            username: client_creds?.username!,
            ip_connection: tokenInfo.ip_connection,
            is_active: client.id_client_state! === ClientStateEnum.ACTIVO
        }
    };
}