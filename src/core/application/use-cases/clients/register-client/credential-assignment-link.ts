/**
 * Link emailed to a newly registered client to assign their portal credentials.
 * `platformUrl` is the public base of the client portal (PLATFORM_URL), e.g.
 * `https://app.example.com/portal`; the front serves the form at `/activate`.
 */
export const credentialAssignmentLink = (platformUrl: string, token: string): string =>
    `${platformUrl.replace(/\/+$/, '')}/activate?token=${encodeURIComponent(token)}`;
