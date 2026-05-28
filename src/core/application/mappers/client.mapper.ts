import { Client } from "src/core/domain/entities/client.entity";
import { AllClientsInfoDTO, PaginateBaseDTO } from "../dtos";
import { ClientStateEnum } from "src/core/domain/enum";
import { IdType } from "src/core/domain/entities/id-type.entity";

export class ClientMapper {
    public static mapAllClients(total_items: number, page: number, clients: Client[], id_types: IdType[]): PaginateBaseDTO<AllClientsInfoDTO[]> {
        return {
            total_items,
            page,
            data: clients.map((cli): AllClientsInfoDTO => ({
                id_client: Number(cli.id_client),
                id_state: Number(cli.id_client_state!),
                state: ClientStateEnum[cli.id_client_state!]?.replace(/_/g, ' '),
                name: cli.name!,
                id_type: id_types[cli.id_type!].code,
                id_number: cli.id_number!,
                email: cli.email!,
                cell_phone: `${cli.cell_callsign}${cli.cell_phone}`
            }))
        }
    }
}