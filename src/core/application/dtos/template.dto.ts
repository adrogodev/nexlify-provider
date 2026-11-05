export interface TemplateInfoDTO {
    id_template: string,
    name: string | null,
    subject: string | null,
    template: string | null,
    is_active: boolean | null,
    /** Declared placeholder names (S2). */
    variables: string[],
    category: string | null,
    locale: string | null,
    created_at: Date | null
}
