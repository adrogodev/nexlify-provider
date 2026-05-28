import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class GetAllClientRequestData {
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    page: number;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    size: number;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    id_state: number;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    id_type: number;

    @IsString()
    @IsOptional()
    id_number: string;

    @IsString()
    @IsOptional()
    name: string;

}