import { Inject, Injectable } from '@nestjs/common';
import type { IJwtGenerator, JWTPayload } from 'src/core/application/contracts/infrastructure';
import { JWT_GENERATOR } from 'src/core/application/contracts/infrastructure';
import type { IAdminUserRepository, IClientRepository } from 'src/core/application/contracts/persistence';
import { ADMIN_USER_REPOSITORY, CLIENT_REPOSITORY } from 'src/core/application/contracts/persistence';
import { ClientStateEnum } from 'src/core/domain/enum';
import { UnauthenticatedException, UnauthorizedException } from 'src/core/domain/exceptions';
import { TokenInfo } from 'src/core/domain/models';
import { AppEnvs as _env } from 'src/infrastructure/environments/app-env.config';

@Injectable()
export class AuthenticatedUserSecurity {
    constructor(
        @Inject(JWT_GENERATOR) private readonly _jwt: IJwtGenerator,
        @Inject(ADMIN_USER_REPOSITORY) private readonly _adminUserRepository: IAdminUserRepository,
        @Inject(CLIENT_REPOSITORY) private readonly _clientRepository: IClientRepository,
    ) { }

    async run(authHeader: Nullable<string>, ip_connection?: string): Promise<{ auth_data: TokenInfo }> {
        if (!authHeader) throw new UnauthorizedException('No autorizado');

        if (!authHeader.toLowerCase().startsWith('bearer')) {
            throw new UnauthorizedException('No autorizado, formato inválido');
        }

        const token = authHeader.replace(/(\s|bearer|Bearer)/g, '');
        const tokenDecode = this._jwt.getDataToken<TokenInfo>(token, _env.JWT_SECRET_KEY);

        if (tokenDecode.isExpired) throw new UnauthenticatedException('Token expirado');
        if (tokenDecode.isNotValid) throw new UnauthorizedException('Token inválido');

        const content = TokenInfo.create((tokenDecode.data as JWTPayload<TokenInfo>).payload);

        // Role discrimination by the is_admin claim (design fix for the
        // admin/clients id collision): an admin JWT NEVER resolves against the
        // clients table and vice versa, so a shared numeric index can no longer
        // misclassify a session or block it with the other table's state.
        if (content.is_admin === true) {
            const user = await this._adminUserRepository.getByIdAsync(BigInt(content.id_user));
            if (!user) throw new UnauthorizedException('No autenticado');
            if (!user.is_active) throw new UnauthorizedException('Usuario inactivo');

            if (ip_connection !== content.ip_connection) {
                throw new UnauthorizedException();
            }

            return { auth_data: content };
        }

        const client = await this._clientRepository.getByIdAsync(BigInt(content.id_user));
        if (client) {
            // Only clients in their lifecycle share this path; admins never land
            // here because of the claim check above.
            if (client.id_client_state !== ClientStateEnum.ACTIVO) {
                throw new UnauthorizedException('Cliente inactivo');
            }

            if (ip_connection !== content.ip_connection) {
                throw new UnauthorizedException();
            }

            return { auth_data: content };
        }

        throw new UnauthorizedException('No autenticado');
    }
}
