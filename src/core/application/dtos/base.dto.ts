export interface PaginateBaseDTO<T> {
    total_items: number,
    page: number,
    data: T
}