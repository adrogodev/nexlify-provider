import { UserDataDTO } from "./user-data.dto";

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

export interface ClientDataDTO extends UserDataDTO { }

export interface ClientDetailDTO {
    id_client: number;
    id_state: number;
    state: string;
    id_type: number;
    id_type_code: string;
    id_type_name: string;
    id_number: string;
    name: string;
    email: string;
    cell_callsign: string;
    cell_phone: string;
    admin_user: string;
    created_at: string;
}