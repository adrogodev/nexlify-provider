export interface AllClientsInfoDTO {
    id_client: number,
    id_state: number,
    state: string;
    name: string;
    id_type: string;
    id_number: string;
    email: string;
    cell_phone?: Nullable<string>;
}