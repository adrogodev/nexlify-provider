export type { }

import type { TokenInfo } from 'src/core/domain/models';

declare global {
    type Nullable<T> = T | null;

    namespace Express {
        interface Request {
            auth_data: TokenInfo;
        }
    }
}
