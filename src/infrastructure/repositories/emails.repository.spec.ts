import { EmailStateEnum } from 'src/core/domain/enum';
import { EmailsRepository } from './emails.repository';

describe('EmailsRepository.countSentOn', () => {
    const makeRepo = () => {
        const emails = { count: jest.fn(async () => 4) };
        const repo = new EmailsRepository({ emails } as never);
        return { repo, emails };
    };

    it('counts emails that left the server in the window, including ones that later bounced', async () => {
        const { repo, emails } = makeRepo();
        const from = new Date('2026-11-10T00:00:00Z');
        const to = new Date('2026-11-10T21:00:00Z');

        const count = await repo.countSentOn(from, to);

        expect(count).toBe(4);
        expect(emails.count).toHaveBeenCalledWith({
            where: {
                state: { in: [EmailStateEnum.SENT, EmailStateEnum.WARNING, EmailStateEnum.BOUNCED] },
                sent_at: { gte: from, lte: to },
            },
        });
    });
});
