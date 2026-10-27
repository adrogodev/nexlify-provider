import { Client } from 'src/core/domain/entities/client.entity';
import { IdType } from 'src/core/domain/entities/id-type.entity';
import { ClientStateEnum } from 'src/core/domain/enum';
import { AllClientsInfoDTO, PaginateBaseDTO } from '../dtos';
import { ClientDetailDTO } from '../dtos/client.dto';

export class ClientMapper {
    public static mapAllClients(
        total_items: number,
        page: number,
        clients: Client[],
        id_types: IdType[],
    ): PaginateBaseDTO<AllClientsInfoDTO[]> {
        return {
            total_items,
            page,
            data: clients.map(
                (cli): AllClientsInfoDTO => {
                    const id_type = id_types.find(
                        (type) => type.id_type === cli.id_type,
                    );

                    return {
                        id_client: Number(cli.id_client),
                        id_state: Number(cli.id_client_state!),
                        state: ClientStateEnum[cli.id_client_state!]?.replace(
                            /_/g,
                            ' ',
                        ),
                        name: cli.name!,
                        id_type: id_type?.code ?? '',
                        id_number: cli.id_number!,
                        email: cli.email!,
                        cell_phone:
                            `${cli.cell_callsign ?? ''}${cli.cell_phone ?? ''}`,
                    };
                },
            ),
        };
    }

    public static mapClientDetail(
        client: Client,
        admin_user: string,
        id_types: IdType[],
    ): ClientDetailDTO {
        const id_type = id_types.find(
            (type) => type.id_type === client.id_type,
        );

        return {
            id_client: Number(client.id_client),
            id_state: Number(client.id_client_state!),
            state: ClientStateEnum[client.id_client_state!]?.replace(/_/g, ' '),
            id_type: Number(client.id_type!),
            id_type_code: id_type?.code ?? '',
            id_type_name: id_type?.name ?? '',
            id_number: client.id_number!,
            name: client.name!,
            email: client.email!,
            cell_callsign: client.cell_callsign ?? '',
            cell_phone: client.cell_phone ?? '',
            admin_user,
            created_at: client.created_at?.toISOString() ?? '',
        };
    }
}
