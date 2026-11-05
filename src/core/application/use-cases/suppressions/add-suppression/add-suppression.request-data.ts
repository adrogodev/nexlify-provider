import { Type } from 'class-transformer';
import {
    IsEmail,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { SuppressionReasonEnum } from 'src/core/domain/enum';

export class AddSuppressionRequestData {
    @IsEmail()
    email: string;

    /** Only MANUAL can be added through the API; the rest come from bounces/unsubscribes. */
    @IsOptional()
    @IsIn([SuppressionReasonEnum.MANUAL])
    reason?: SuppressionReasonEnum.MANUAL;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    details?: string;

    /** Administration flow: suppress for a client (omitted by an admin = platform-wide). */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    id_client?: number;
}

export type AddSuppressionInput = AddSuppressionRequestData;
