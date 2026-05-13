import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { SMTP_SERVER_REPOSITORY } from 'src/core/application/contracts/persistence';
import { AlreadyExistsException } from 'src/core/domain/exceptions';

@Injectable()
export class SmtpServerExistsGuard implements CanActivate {
    constructor(
        @Inject(SMTP_SERVER_REPOSITORY) private readonly _smtpServerRepository: any
    ) { }

    async canActivate(_: ExecutionContext): Promise<boolean> {
        const smtpServers = await this._smtpServerRepository.getAllAsync();
        if (smtpServers.length > 0) {
            throw new AlreadyExistsException('Ya existe un servidor SMTP registrado');
        }
        return true;
    }
}