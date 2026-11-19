import { type ApplicationEnvs, NodeEnvEnum } from "./environment.config"
import * as env from "env-var"
import "dotenv/config"

const PORT = env.get("PORT").required().asPortNumber();

export const AppEnvs: Readonly<ApplicationEnvs> = Object.freeze<ApplicationEnvs>({
    PORT,
    NODE_ENV: env.get("NODE_ENV").default("development").asEnum<NodeEnvEnum>([
        NodeEnvEnum.DEVELOPMENT,
        NodeEnvEnum.STAGING,
        NodeEnvEnum.PRODUCTION
    ]),
    ADMIN_USER: env.get("ADMIN_USER").required().asString(),
    ADMIN_PASSWORD: env.get("ADMIN_PASSWORD").required().asString(),
    PLATFORM_URL: env.get("PLATFORM_URL").required().asString(),
    CORS_ORIGINS: env.get("CORS_ORIGINS").default("").asString(),
    JWT_SECRET_KEY: env.get("JWT_SECRET_KEY").required().asString(),
    JWT_EXPIRATION_TIME: env.get("JWT_EXPIRATION_TIME").required().asInt(),
    ENCRYPT_KEY: env.get("ENCRYPT_KEY").required().asString(),
    INBOUND_WEBHOOK_SECRET: env.get("INBOUND_WEBHOOK_SECRET").required().asString(),
    PUBLIC_API_URL: env.get("PUBLIC_API_URL").default(`http://localhost:${env.get("PORT").required().asPortNumber()}`).asString().replace(/\/+$/, ""),
    ANTHROPIC_API_KEY: env.get("ANTHROPIC_API_KEY").asString() || undefined,
    ANTHROPIC_MODEL: env.get("ANTHROPIC_MODEL").default("claude-opus-5-5").asString(),
})
