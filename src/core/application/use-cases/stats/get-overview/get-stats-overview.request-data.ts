import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches } from 'class-validator';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class GetStatsOverviewRequestData {
    /** Inclusive first day (YYYY-MM-DD, UTC). Default: 29 days before `to`. */
    @IsOptional()
    @Matches(DAY, { message: 'from debe tener el formato YYYY-MM-DD' })
    from?: string;

    /** Inclusive last day (YYYY-MM-DD, UTC). Default: today. */
    @IsOptional()
    @Matches(DAY, { message: 'to debe tener el formato YYYY-MM-DD' })
    to?: string;

    /** Admin only: restrict the aggregates to one client. */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    id_client?: number;
}

export type GetStatsOverviewInput = GetStatsOverviewRequestData;
