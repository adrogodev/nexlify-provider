import { IIdTypeRepository } from "src/core/application/contracts/persistence";
import { MasterDataDTO } from "src/core/application/dtos";
import { MasterMapper } from "src/core/application/mappers";
import { UseCase, UseCaseArgs } from "src/core/domain/models";

export class IdTypesUseCase implements UseCase<null, MasterDataDTO[]> {
    constructor(
        private readonly _idTypesRepository: IIdTypeRepository
    ) { }

    public run = async (_: UseCaseArgs<null>): Promise<MasterDataDTO[]> => {

        const id_types = await this._idTypesRepository.getAllAsync();

        return MasterMapper.toMapIdTypes(id_types);
    };
}