import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateTemplateRequestData {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    subject?: string;

    /** Template body content; placeholder variables come later. */
    @IsOptional()
    @IsString()
    template?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    /** Declared placeholder names used by `{{name}}` in subject/body (S2). */
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    variables?: string[];

    @IsOptional()
    @IsString()
    @MaxLength(50)
    category?: string;

    @IsOptional()
    @IsString()
    @MaxLength(10)
    locale?: string;
}

export type CreateTemplateInput = CreateTemplateRequestData;
