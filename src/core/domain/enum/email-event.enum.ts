/**
 * Client-subscribable email events (S4). Open to more values later
 * (bounce, auto-reply); every stored subscription stores a comma list
 * of exactly these enum values.
 */
export enum EmailEventEnum {
    RECEIVED_REPLY = 'RECEIVED_REPLY',
}
