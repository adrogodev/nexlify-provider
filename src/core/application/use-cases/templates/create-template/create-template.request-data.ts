import { IsBoolean, IsOptional, IsString } from "class-validator";

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
}

export type CreateTemplateInput = CreateTemplateRequestData;
