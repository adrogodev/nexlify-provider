export interface PaginateBaseDTO<T> {
    total_items: number,
    page: number,
    data: T
}


export interface MasterDataDTO {
    id: number | bigint | string,
    value: string
}