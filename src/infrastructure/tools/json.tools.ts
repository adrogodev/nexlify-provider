export const JSONParse = <T>(data: T) =>
    JSON.parse(
        JSON.stringify(data, (_, value) => (typeof value === "bigint" ? value.toString() : value))
    )
