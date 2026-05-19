export const TEMPLATE_SERVICE = Symbol('ITemplateService')

export interface ITemplateService {
    assignClientCredentials(): Promise<Nullable<string>>
}