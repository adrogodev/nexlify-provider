export const UNSUBSCRIBE_SUPPRESSIONS_REPOSITORY = Symbol(
    'IUnsubscribeSuppressionsRepository',
);

/**
 * Minimal write port over the `suppressions` table used by the AI reply
 * intelligence (S8): an UNSUBSCRIBE_REQUEST reply suppresses its sender.
 * The full suppression feature (S5) owns listing/CRUD.
 */
export interface IUnsubscribeSuppressionsRepository {
    /**
     * Inserts an UNSUBSCRIBE suppression unless the same client+email is
     * already suppressed. Returns true only when a new row was inserted.
     */
    addUnsubscribe(args: {
        id_client: bigint | null;
        email: string;
        source_email_id: bigint;
        details: string | null;
    }): Promise<boolean>;
}
