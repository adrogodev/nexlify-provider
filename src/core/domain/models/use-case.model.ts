export interface UseCase<T, U> {
    run: (args: UseCaseArgs<T>) => Promise<U>
}

export interface UseCaseArgs<T> {
    data: T
}