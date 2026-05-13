import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { ConfigurationExistsGuard } from './configuration-exists.guard';
import { SmtpServerExistsGuard } from './smtp-server-exists.guard';

@Module({
    imports: [RepositoriesModule],
    providers: [ConfigurationExistsGuard, SmtpServerExistsGuard],
    exports: [ConfigurationExistsGuard, SmtpServerExistsGuard],
})
export class GuardsModule { }