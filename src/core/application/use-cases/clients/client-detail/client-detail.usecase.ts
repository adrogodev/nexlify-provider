import {
    IClientCredentialsRepository,
    IClientRepository,
    IIdTypeRepository,
} from 'src/core/application/contracts/persistence';
import { ClientDetailDTO } from 'src/core/application/dtos';
import { ClientMapper } from 'src/core/application/mappers/client.mapper';
import { ClientStateEnum } from 'src/core/domain/enum';
import { NotFoundException } from 'src/core/domain/exceptions';
import { UseCase, UseCaseArgs } from 'src/core/domain/models';
import { GetClientDetailRequestData } from './get-client-detail.request.data';

export class ClientDetailUseCase
    implements UseCase<GetClientDetailRequestData, ClientDetailDTO>
{
    constructor(
        private readonly _clientRepository: IClientRepository,
        private readonly _clientCredentialsRepository: IClientCredentialsRepository,
        private readonly _idTypesRepository: IIdTypeRepository,
    ) {}

    public run = async (
        args: UseCaseArgs<GetClientDetailRequestData>,
    ): Promise<ClientDetailDTO> => {
        const { id_client } = args.data;

        const client = await this._clientRepository.getByIdAsync(
            BigInt(id_client),
        );
        if (!client) throw new NotFoundException('Cliente no encontrado');

        const client_credentials =
            await this._clientCredentialsRepository.findByClientId(
                client.id_client,
            );
        if (!client_credentials)
            throw new NotFoundException(
                'Credenciales del cliente no encontradas',
            );

        const id_types = await this._idTypesRepository.getAllAsync();

        return ClientMapper.mapClientDetail(
            client,
            client_credentials.username ?? '',
            id_types,
        );
    };
}
