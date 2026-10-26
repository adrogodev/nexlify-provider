import type { IJwtGenerator, JWTPayload } from 'src/core/application/contracts/infrastructure';
import { TokenData } from 'src/core/domain/models/token-data.model';
import { JSONParse } from '../tools/json.tools';
import jwt, { type Algorithm } from "jsonwebtoken"

export class JwtGeneratorHelper implements IJwtGenerator {

    #ALGORITHM: Algorithm = "HS512";

    #assertKey(key: string): string {
        if (!key) {
            throw new Error("A non-empty JWT key is required");
        }
        return key;
    }

    public createTokenWithExpiration = <T>(options: { data: T; key: string; expiresIn: string; }): string => {
        const { ...values } = options;
        values.key = this.#assertKey(values.key);
        const timeElapsed = Date.now();
        const today = new Date(timeElapsed);
        const timestamp = today.toISOString();

        const payload: JWTPayload<T> = {
            payload: JSONParse(values.data),
            check: true,
            date: timestamp
        };

        return jwt.sign(payload, values.key, {
            algorithm: this.#ALGORITHM,
            expiresIn: values.expiresIn
        });
    }

    public createTokenWithoutExpiration = <T>(options: { data: T; key: string; }): string => {
        const { ...values } = options;
        values.key = this.#assertKey(values.key);
        const timeElapsed = Date.now();
        const today = new Date(timeElapsed);
        const timestamp = today.toISOString();

        const payload: JWTPayload<T> = {
            payload: JSONParse(values.data),
            check: true,
            date: timestamp
        };

        return jwt.sign(payload, values.key, {
            algorithm: this.#ALGORITHM
        });
    }

    public getDataToken = <T>(token: string, key: string): TokenData<Nullable<JWTPayload<T>>> => {
        let isExpired = false;
        let isNotValid = false;
        let data: Nullable<JWTPayload<T>> = null;

        key = this.#assertKey(key);

        try {
            data = jwt.verify(token, key) as JWTPayload<T>
        } catch (error: any) {
            if (error.name === "TokenExpiredError") {
                isExpired = true;
            }
            isNotValid = true;
        }

        return TokenData.create<Nullable<JWTPayload<T>>>({
            data,
            isExpired,
            isNotValid
        })
    }

}
