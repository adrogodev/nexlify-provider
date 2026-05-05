import "dotenv/config"
import * as env from "env-var"
import { type ApplicationEnvs, NodeEnvEnum } from "./environment.config"


export const AppEnvs: Readonly<ApplicationEnvs> = Object.freeze<ApplicationEnvs>({
    PORT: env.get("PORT").required().asPortNumber(),
    NODE_ENV: env.get("NODE_ENV").default("development").asEnum<NodeEnvEnum>([
        NodeEnvEnum.DEVELOPMENT,
        NodeEnvEnum.STAGING,
        NodeEnvEnum.PRODUCTION
    ]),
    ADMIN_USER: env.get("ADMIN_USER").required().asString(),
    ADMIN_PASSWORD: env.get("ADMIN_PASSWORD").required().asString()
})