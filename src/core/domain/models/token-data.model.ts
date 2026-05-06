export class TokenData<T> {
    #isExpired: boolean;
    #isNotValid: boolean;
    #data: T

    private constructor(isExpired: boolean, isNotValid: boolean, data: T) {
        this.#isExpired = isExpired;
        this.#isNotValid = isNotValid;
        this.#data = data;
    }

    get isExpired() {
        return this.#isExpired;
    }

    get isNotValid() {
        return this.#isNotValid;
    }

    get data() {
        return this.#data;
    }

    static create<T>(args: { isExpired: boolean, isNotValid: boolean, data: T }) {
        return new TokenData(args.isExpired, args.isNotValid, args.data);
    }
}