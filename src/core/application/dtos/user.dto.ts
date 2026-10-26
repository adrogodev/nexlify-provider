export interface UserInfoDTO {
    id_user: number,
    id_client: number | null,
    id_type: number | null,
    id_number: string | null,
    first_name: string | null,
    second_name: string | null,
    first_surname: string | null,
    second_surname: string | null,
    email: string | null,
    cell_callsign: string | null,
    cell_phone: string | null,
    birthdate: Date | null,
    state: boolean | null,
    created_at: Date | null
}
