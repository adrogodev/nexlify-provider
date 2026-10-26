import { IsBoolean, IsOptional, IsString, IsUUID } from "class-validator";

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
}

export type UpdateTemplateInput = UpdateTemplateRequestData & { id_template: string };
