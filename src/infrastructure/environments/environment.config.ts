export enum NodeEnvEnum {
    DEVELOPMENT = "development",
    STAGING = "staging",
    PRODUCTION = "production"
}

export interface ApplicationEnvs {
    PORT: number;
    NODE_ENV: string;
    ADMIN_USER: string;
    ADMIN_PASSWORD: string;
    PLATFORM_URL: string;
    JWT_SECRET_KEY: string;
    JWT_EXPIRATION_TIME: number;
    ENCRYPT_KEY: string;
}
