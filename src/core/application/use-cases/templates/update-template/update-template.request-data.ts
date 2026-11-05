import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class TemplateIdParam {
    /** The templates table key is a DB-side uuid. */
    @IsUUID(4)
    id: string;
}

export class UpdateTemplateRequestData {
    @IsOptional()
    @IsString()
    subject?: string;

    /** Template body content. */
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

export type UpdateTemplateInput = UpdateTemplateRequestData & { id_template: string };
