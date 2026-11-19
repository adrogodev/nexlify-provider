import type { Email } from 'src/core/domain/entities/email.entity';
import { NotFoundException } from 'src/core/domain/exceptions';
import type { TokenInfo } from 'src/core/domain/models';

/** Admins see every email; clients (JWT or X-API-Key) only their own `id_client` rows. */
export function canAccessEmail(
    auth: TokenInfo | null | undefined,
    email: Email,
): boolean {
    if (auth?.is_admin === true) return true;
    if (auth === null || auth === undefined) return false;
    return (
        email.id_client !== null &&
        email.id_client !== undefined &&
        email.id_client === BigInt(auth.id_user)
    );
}

/**
 * Owner stored on a new email: the calling client, or null for admin sends
 * (admin-owned emails are only visible to admins).
 */
export function ownerClientId(auth: TokenInfo): bigint | null {
    return auth.is_admin === true ? null : BigInt(auth.id_user);
}

/**
 * Same 404 for "missing" and "not yours": a client never learns that
 * another client's email exists.
 */
export function assertEmailAccess(
    auth: TokenInfo | null | undefined,
    email: Email | null,
): Email {
    if (email === null || !canAccessEmail(auth, email)) {
        throw new NotFoundException('El correo solicitado no existe');
    }
    return email;
}
