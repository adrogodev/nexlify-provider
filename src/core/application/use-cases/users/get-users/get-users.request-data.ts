import { Type } from "class-transformer";
import { IsInt, IsNumber, IsOptional } from "class-validator";
import { GetUsersFilters } from "src/core/application/contracts/persistence/users.repository";

export class GetUsersRequestData {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    limit?: number;

    /** Admin-only filter; the use case forces the caller client for users. */
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    id_client?: number;
}

export type GetUsersInput = GetUsersRequestData;

export function toGetUsersFilters(data: GetUsersInput): GetUsersFilters {
    return {
        id_client: data.id_client === undefined || data.id_client === null ? undefined : BigInt(data.id_client),
        page: data.page,
        limit: data.limit,
    };
}
