import { Injectable } from '@nestjs/common';
import type { IAppConfig } from 'src/core/application/contracts/infrastructure';
import { AppEnvs as _env } from './app-env.config';

@Injectable()
export class AppConfigService implements IAppConfig {
    public readonly JWT_SECRET_KEY = _env.JWT_SECRET_KEY;
    public readonly JWT_EXPIRATION_TIME = _env.JWT_EXPIRATION_TIME;
    public readonly ENCRYPT_KEY = _env.ENCRYPT_KEY;
    public readonly PLATFORM_URL = _env.PLATFORM_URL;
}
