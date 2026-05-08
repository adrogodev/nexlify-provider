import { Module } from '@nestjs/common';
import { HelpersModule } from 'src/infrastructure/helpers/helpers.module';
import { RepositoriesModule } from 'src/infrastructure/repositories/repositories.module';
import { AuthenticatedUserSecurity } from './authenticated-user.security';

@Module({
    imports: [RepositoriesModule, HelpersModule],
    providers: [AuthenticatedUserSecurity],
    exports: [AuthenticatedUserSecurity],
})
export class SecurityModule {}
