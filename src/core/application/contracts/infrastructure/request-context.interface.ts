import type { TokenInfo } from 'src/core/domain/models';

export const REQUEST_CONTEXT = Symbol('IRequestContext');

export interface IRequestContext {
    set(tokenInfo: TokenInfo): void;
    run<R>(tokenInfo: TokenInfo, callback: () => R): R;
    get(): TokenInfo;
}
