import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class GetAllClientRequestData {
    @IsNumber()
    @IsNotEmpty()
    page: number;

    @IsNumber()
    @IsNotEmpty()
    size: number;

    @IsNumber()
    @IsNotEmpty()
    id_state: number;

    @IsNumber()
    @IsNotEmpty()
    id_type: number;

    @IsNumber()
    @IsNotEmpty()
    id_number: string;

    @IsString()
    @IsNotEmpty()
    name: string;

}