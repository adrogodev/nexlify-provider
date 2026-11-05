import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SuppressionReasonEnum } from 'src/core/domain/enum';

export class ListSuppressionsRequestData {
    /** Partial, case-insensitive address match. */
    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsEnum(SuppressionReasonEnum)
    reason?: SuppressionReasonEnum;

    /** Admin only: filter by client (ignored for clients). */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    id_client?: number;

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

export type ListSuppressionsInput = ListSuppressionsRequestData;
