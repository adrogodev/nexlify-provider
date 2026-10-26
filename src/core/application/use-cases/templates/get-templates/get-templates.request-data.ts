import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";
import { GetTemplatesFilters } from "src/core/application/contracts/persistence/templates.repository";

export class GetTemplatesRequestData {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;
}

export type GetTemplatesInput = GetTemplatesRequestData;

export function toGetTemplatesFilters(data: GetTemplatesInput): GetTemplatesFilters {
    return {
        page: data.page,
        limit: data.limit,
    };
}
