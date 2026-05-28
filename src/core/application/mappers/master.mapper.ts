import { IdType } from "src/core/domain/entities/id-type.entity";
import { MasterDataDTO } from "../dtos";

export class MasterMapper {
    public static toMapIdTypes(id_types: IdType[]): MasterDataDTO[] {
        return id_types.map((idt): MasterDataDTO => ({
            id: idt.id_type,
            value: idt.code
        }));
    }
}