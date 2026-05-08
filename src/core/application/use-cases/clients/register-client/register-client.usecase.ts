import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { RegisterClientInput, RegisterClientRequestData } from "./register-client.request-data";
import { IClientRepository } from "src/core/application/contracts/persistence";
import { UserState } from "src/core/domain/enum/user-state";

export class RegisterClientUseCase implements UseCase<RegisterClientInput, boolean> {
    constructor(
        private readonly _clientRepository: IClientRepository
    ) { }

    public run = async (args: UseCaseArgs<RegisterClientRequestData>): Promise<boolean> => {
        const { ...values } = args.data;

        await this._clientRepository.create({
            id_state: UserState.ACTIVO,
            name: values.name,
            email: values.email,
            cell_callsign: values.cell_callsign,
            cell_phone: values.cell_phone,
            user_first_name: values.user_first_name,
            user_second_name: values.user_second_name || null,
            user_first_surname: values.user_first_surname,
            user_secod_surname: values.user_secod_surname || null
        })

        return true;
    };
}