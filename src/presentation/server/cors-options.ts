import type { CorsOptions } from 'cors';

const toOrigin = (value: string): string | null => {
    try {
        return new URL(value.trim()).origin;
    } catch {
        return null;
    }
};

/**
 * Browser origins allowed to call the API: the origin of PLATFORM_URL (the
 * dashboard and client portal) plus the comma-separated CORS_ORIGINS list.
 */
export function allowedOrigins(
    platformUrl: string,
    extraOrigins: string,
): string[] {
    const candidates = [platformUrl, ...extraOrigins.split(',')]
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map(toOrigin)
        .filter((origin): origin is string => origin !== null);
    return [...new Set(candidates)];
}

/**
 * Requests without an Origin header (server-to-server clients using X-API-Key,
 * curl, health checks) are not subject to CORS and stay allowed.
 */
export function buildCorsOptions(origins: string[]): CorsOptions {
    const allowed = new Set(origins);
    return {
        origin: (requestOrigin, callback) => {
            callback(
                null,
                requestOrigin === undefined || allowed.has(requestOrigin),
            );
        },
    };
}
