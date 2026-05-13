import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { NEXLIFY_CONFIGURATION_REPOSITORY } from 'src/core/application/contracts/persistence';
import { AlreadyExistsException } from 'src/core/domain/exceptions';

@Injectable()
export class ConfigurationExistsGuard implements CanActivate {
    constructor(
        @Inject(NEXLIFY_CONFIGURATION_REPOSITORY) private readonly _nexlifyConfigurationRepository: any
    ) { }

    async canActivate(_: ExecutionContext): Promise<boolean> {
        const configuration = await this._nexlifyConfigurationRepository.findConfiguration();
        if (configuration !== null) {
            throw new AlreadyExistsException('Ya se ha realizado la configuración para esta cuenta');
        }
        return true;
    }
}