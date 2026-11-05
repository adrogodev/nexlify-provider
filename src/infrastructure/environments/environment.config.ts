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
    /** Shared secret of the provider-agnostic inbound webhook (HMAC-SHA256 over the raw body). */
    INBOUND_WEBHOOK_SECRET: string;
    /** Public base URL of this API; defaults to http://localhost:${PORT}. */
    PUBLIC_API_URL: string;
    /** Optional: enables the AI reply intelligence when set. */
    ANTHROPIC_API_KEY: string | undefined;
    /** Claude model used by the AI reply intelligence. */
    ANTHROPIC_MODEL: string;
}
