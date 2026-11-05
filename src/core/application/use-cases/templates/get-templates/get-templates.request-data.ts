import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";
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

    /** S2: filter by template category (exact match). */
    @IsOptional()
    @IsString()
    category?: string;
}

export type GetTemplatesInput = GetTemplatesRequestData;

export function toGetTemplatesFilters(data: GetTemplatesInput): GetTemplatesFilters {
    return {
        page: data.page,
        limit: data.limit,
        category: data.category,
    };
}
