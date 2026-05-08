import { Inject, Injectable } from '@nestjs/common';
import type { IJwtGenerator, JWTPayload } from 'src/core/application/contracts/infrastructure';
import { JWT_GENERATOR } from 'src/core/application/contracts/infrastructure';
import type { IAdminUserRepository } from 'src/core/application/contracts/persistence';
import { ADMIN_USER_REPOSITORY } from 'src/core/application/contracts/persistence';
import { UnauthenticatedException, UnauthorizedException } from 'src/core/domain/exceptions';
import { TokenInfo } from 'src/core/domain/models';
import { AppEnvs as _env } from 'src/infrastructure/environments/app-env.config';

@Injectable()
export class AuthenticatedUserSecurity {
    constructor(
        @Inject(JWT_GENERATOR) private readonly _jwt: IJwtGenerator,
        @Inject(ADMIN_USER_REPOSITORY) private readonly _adminUserRepository: IAdminUserRepository,
    ) { }

    async run(authHeader: Nullable<string>, ip_connection?: string): Promise<{ auth_data: TokenInfo }> {
        if (!authHeader) throw new UnauthorizedException('No autorizado');

        if (!authHeader.toLowerCase().startsWith('bearer')) {
            throw new UnauthorizedException('No autorizado, formato inválido');
        }

        const token = authHeader.replace(/(\s|bearer|Bearer)/g, '');
        const tokenDecode = this._jwt.getDataToken<TokenInfo>(token, _env.JWT_SECRET_KEY);

        if (tokenDecode.isNotValid) throw new UnauthorizedException('Token inválido');
        if (tokenDecode.isExpired) throw new UnauthenticatedException('Token expirado');

        const content = TokenInfo.create((tokenDecode.data as JWTPayload<TokenInfo>).payload);

        const user = await this._adminUserRepository.getByIdAsync(BigInt(content.id_user));
        if (!user) throw new UnauthorizedException('No autenticado');
        if (!user.is_active) throw new UnauthorizedException('Usuario inactivo');

        if (ip_connection !== content.ip_connection) {
            throw new UnauthorizedException();
        }

        return { auth_data: content };
    }
}
