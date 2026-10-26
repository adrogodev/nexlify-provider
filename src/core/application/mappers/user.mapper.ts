import { User } from "src/core/domain/entities/user.entity";
import { UserInfoDTO } from "../dtos";

export class UserMapper {
    public static mapUser(user: User): UserInfoDTO {
        return {
            id_user: Number(user.id_user),
            id_client: user.id_client === null ? null : Number(user.id_client),
            id_type: user.id_type,
            id_number: user.id_number,
            first_name: user.first_name,
            second_name: user.second_name,
            first_surname: user.first_surname,
            second_surname: user.second_surname,
            email: user.email,
            cell_callsign: user.cell_callsign,
            cell_phone: user.cell_phone,
            birthdate: user.birthdate,
            state: user.state,
            created_at: user.created_at
        };
    }
}
