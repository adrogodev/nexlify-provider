export const normalize = <T>(value: T | null | undefined): T | undefined =>
    value === null || value === "" ? undefined : value;
