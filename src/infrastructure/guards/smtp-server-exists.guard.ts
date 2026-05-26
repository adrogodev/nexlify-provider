import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { INexlifyConfigurationRepository, NEXLIFY_CONFIGURATION_REPOSITORY, SMTP_SERVER_REPOSITORY } from 'src/core/application/contracts/persistence';
import { AlreadyExistsException } from 'src/core/domain/exceptions';

@Injectable()
export class SmtpServerExistsGuard implements CanActivate {
    constructor(
        @Inject(NEXLIFY_CONFIGURATION_REPOSITORY) private readonly _nexlifyConfigurationRepository: INexlifyConfigurationRepository
    ) { }

    async canActivate(_: ExecutionContext): Promise<boolean> {
        const configuration = await this._nexlifyConfigurationRepository.findConfiguration();
        if (configuration !== null) {
            if (configuration.id_smtp_server === null) {
                throw new AlreadyExistsException('No se ha configurado el servidor SMTP en la plataforma');
            }
        }
        
        return true;
    }
}