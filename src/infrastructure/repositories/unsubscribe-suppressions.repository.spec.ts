import { SuppressionReasonEnum } from 'src/core/domain/enum';
import { UnsubscribeSuppressionsRepository } from './unsubscribe-suppressions.repository';

describe('UnsubscribeSuppressionsRepository', () => {
    const makeRepo = (existing: unknown) => {
        const suppressions = {
            findByClientAndEmail: jest.fn(async () => existing),
            create: jest.fn(async (data: unknown) => data),
        };
        return { repo: new UnsubscribeSuppressionsRepository(suppressions as never), suppressions };
    };

    it('creates an UNSUBSCRIBE suppression with the normalized address through the suppressions repository', async () => {
        const { repo, suppressions } = makeRepo(null);

        const created = await repo.addUnsubscribe({ id_client: 7n, email: '  Dest@Test.Local ', source_email_id: 9n, details: 'x'.repeat(600) });

        expect(created).toBe(true);
        expect(suppressions.findByClientAndEmail).toHaveBeenCalledWith(7n, 'dest@test.local');
        expect(suppressions.create).toHaveBeenCalledWith({
            id_client: 7n,
            email: 'dest@test.local',
            reason: SuppressionReasonEnum.UNSUBSCRIBE,
            source_email_id: 9n,
            details: 'x'.repeat(500),
        });
    });

    it('does not duplicate an existing suppression for the same client and address', async () => {
        const { repo, suppressions } = makeRepo({ id_suppression: 1n });

        const created = await repo.addUnsubscribe({ id_client: null, email: 'a@b.co', source_email_id: 1n, details: null });

        expect(created).toBe(false);
        expect(suppressions.create).not.toHaveBeenCalled();
    });
});
