import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from './auth.guard';
import { ApiKeyGuard } from './api-key.guard';

/**
 * Email routes accept two authentication methods:
 * - `X-API-Key` header: programmatic client integration.
 * - Bearer JWT (admin or client session): the dashboard flows.
 */
@Injectable()
export class EmailAuthGuard implements CanActivate {
    constructor(
        private readonly _apiKeyGuard: ApiKeyGuard,
        private readonly _authGuard: AuthGuard,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const apiKeyHeader = request.headers['x-api-key'];
        const hasApiKeyHeader = typeof apiKeyHeader === 'string' && apiKeyHeader.length > 0;

        if (hasApiKeyHeader) {
            return await this._apiKeyGuard.canActivate(context);
        }

        return await this._authGuard.canActivate(context);
    }
}
