export const APP_CONFIG = Symbol('IAppConfig');

export interface IAppConfig {
    JWT_SECRET_KEY: string;
    JWT_EXPIRATION_TIME: number;
    ENCRYPT_KEY: string;
    PLATFORM_URL: string;
}
