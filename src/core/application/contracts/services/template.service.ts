export const TEMPLATE_SERVICE = Symbol('ITemplateService')

export interface ITemplateService {
    assignClientCredentials(client: string, link: string, support_email: string): Promise<Nullable<string>>
}