import { type ApplicationEnvs, NodeEnvEnum } from "./environment.config"
import * as env from "env-var"
import "dotenv/config"


export const AppEnvs: Readonly<ApplicationEnvs> = Object.freeze<ApplicationEnvs>({
    PORT: env.get("PORT").required().asPortNumber(),
    NODE_ENV: env.get("NODE_ENV").default("development").asEnum<NodeEnvEnum>([
        NodeEnvEnum.DEVELOPMENT,
        NodeEnvEnum.STAGING,
        NodeEnvEnum.PRODUCTION
    ]),
    ADMIN_USER: env.get("ADMIN_USER").required().asString(),
    ADMIN_PASSWORD: env.get("ADMIN_PASSWORD").required().asString(),
    PLATFORM_URL: env.get("PLATFORM_URL").required().asString(),
    JWT_SECRET_KEY: env.get("JWT_SECRET_KEY").required().asString(),
    JWT_EXPIRATION_TIME: env.get("JWT_EXPIRATION_TIME").required().asInt(),
    ENCRYPT_KEY: env.get("ENCRYPT_KEY").required().asString(),
})
