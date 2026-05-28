import { AllClientsInfoDTO, PaginateBaseDTO } from "src/core/application/dtos";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { GetAllClientRequestData } from "./get-all-clients.request.data";
import { IClientRepository, IIdTypeRepository } from "src/core/application/contracts/persistence";
import { ClientMapper } from "src/core/application/mappers/client.mapper";

export class GetAllClientsUseCase implements UseCase<GetAllClientRequestData, PaginateBaseDTO<AllClientsInfoDTO[]>> {

    constructor(
        private readonly _clientRepository: IClientRepository,
        private readonly _idTypesRespository: IIdTypeRepository
    ) { }

    public run = async (args: UseCaseArgs<GetAllClientRequestData>): Promise<PaginateBaseDTO<AllClientsInfoDTO[]>> => {
        const { ...values } = args.data;

        const page = values.page ?? 1;
        const size = values.size ?? 10;

        const clients = await this._clientRepository.getAllClientByFilters(
            page, size, values.id_state, values.id_type, values.id_number, values.name
        );

        const id_types = await this._idTypesRespository.getAllAsync();

        return ClientMapper.mapAllClients(clients.count, page, clients.data, id_types);
    };
}