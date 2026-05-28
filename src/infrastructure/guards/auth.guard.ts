import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedUserSecurity } from 'src/infrastructure/security';
import type { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly _security: AuthenticatedUserSecurity,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const authHeader = (request.headers['authorization'] as string) ?? null;
        const ip = (request.ip ?? '').replace('::ffff:', '');

        const { auth_data } = await this._security.run(authHeader, ip);

        request.auth_data = auth_data;

        return true;
    }
}
