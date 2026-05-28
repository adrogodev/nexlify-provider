import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import type { IRequestContext } from 'src/core/application/contracts/infrastructure';
import { UnauthorizedException } from 'src/core/domain/exceptions';
import type { TokenInfo } from 'src/core/domain/models';

@Injectable()
export class ContextService implements IRequestContext {
    private readonly _storage = new AsyncLocalStorage<TokenInfo>();

    set(tokenInfo: TokenInfo): void {
        this._storage.enterWith(tokenInfo);
    }

    run<R>(tokenInfo: TokenInfo, callback: () => R): R {
        return this._storage.run(tokenInfo, callback);
    }

    get(): TokenInfo {
        const store = this._storage.getStore();
        if (!store) {
            throw new UnauthorizedException('No hay contexto de autenticación');
        }
        return store;
    }
}
