import { Inject, Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { IHashGenerator } from 'src/core/application/contracts/infrastructure';
import { HASH_GENERATOR } from 'src/core/application/contracts/infrastructure';
import type { INexlifyKeysRepository } from 'src/core/application/contracts/persistence';
import { NEXLIFY_KEYS_REPOSITORY } from 'src/core/application/contracts/persistence';
import { UnauthenticatedException } from 'src/core/domain/exceptions';
import { TokenInfo } from 'src/core/domain/models';
import type { CanActivate } from '@nestjs/common';

/**
 * Authenticates programmatic clients through the `X-API-Key` header.
 * Keys are stored SHA-256 hashed and only active keys authenticate.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(
        @Inject(NEXLIFY_KEYS_REPOSITORY) private readonly _nexlifyKeysRepository: INexlifyKeysRepository,
        @Inject(HASH_GENERATOR) private readonly _hashGenerator: IHashGenerator,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request & { auth_data?: TokenInfo }>();
        const apiKey = (request.headers['x-api-key'] as string | undefined)?.trim();

        if (!apiKey) {
            throw new UnauthenticatedException('API key no informada');
        }

        const key = await this._nexlifyKeysRepository.findActiveByHashedKey(this._hashGenerator.SHA256(apiKey));
        if (key === null || key.id_client === null) {
            throw new UnauthenticatedException('API key invalida');
        }

        const ip = (request.ip ?? '').replace('::ffff:', '');
        request.auth_data = TokenInfo.create({
            jti: null,
            ip_connection: ip,
            id_user: Number(key.id_client),
            is_admin: false,
        });

        return true;
    }
}
