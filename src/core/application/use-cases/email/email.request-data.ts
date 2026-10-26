import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { EmailStateEnum } from 'src/core/domain/enum';

@ValidatorConstraint({ name: 'email-id', async: false })
export class EmailIdConstraint implements ValidatorConstraintInterface {
    private readonly UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    private readonly SHORT = /^NX-[0-9A-Za-z]{1,20}$/;

    validate(value: string): boolean {
        if (typeof value !== 'string' || value === '') return false;
        return this.UUID.test(value) || this.SHORT.test(value);
    }

    defaultMessage(): string {
        return 'emailId debe ser un UUID v4 o un short code (NX-XXXXXXXX)';
    }
}

export class GetEmailsRequestData {
    @IsOptional()
    @IsEnum(EmailStateEnum)
    state?: EmailStateEnum;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    id_client?: number;

    @IsOptional()
    @Type(() => Date)
    from_date?: Date;

    @IsOptional()
    @Type(() => Date)
    to_date?: Date;

    @IsOptional()
    @IsString()
    short_code?: string;

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

export class EmailIdParam {
    /** Accepts the email uuid (v4) or the short code (NX-XXXXXXX). */
    @Validate(EmailIdConstraint)
    emailId: string;
}
