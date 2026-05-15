export interface ITemplateService {
    assignClientCredentials(): Promise<Nullable<string>>
}