import 'reflect-metadata';
import { DiffuseEmailUseCase } from './diffuse-email.usecase';
import { ActionNotAllowedException } from 'src/core/domain/exceptions';
import { EmailStateEnum } from 'src/core/domain/enum';

describe('DiffuseEmailUseCase', () => {
    const config = {
        id_configuration: 1n,
        sender_email: 'sender@nexlify.local',
        id_smtp_server: 5n,
        daily_send_limit: 500,
    };

    const shortCode = 'NX-AAAAAA1';

    const build = (overrides?: { config?: unknown; sentToday?: number; createThrows?: boolean }) => {
        const cfg = overrides?.config !== undefined ? overrides.config : config;
        const generated: string[] = [];
        let created = 0;
        const emailsRepo = {
            create: jest.fn(async (data: Record<string, unknown>) => {
                if (overrides?.createThrows) throw new Error('boom');
                created++;
                generated.push(`NX-BBBBBB${created}`);
                return { ...data, id_email: BigInt(created), short_code: generated[generated.length - 1], email_uuid: `db-side-uuid-${created}` };
            }),
            countSentOn: jest.fn(async () => overrides?.sentToday ?? 0),
        } as never;
        const configRepo = { findConfiguration: jest.fn(async () => cfg) } as never;
        const idGen = { generateShortCode: jest.fn(() => shortCode), generateUuid: jest.fn(() => 'code-never-generates-uuid') } as never;
        const useCase = new DiffuseEmailUseCase(configRepo, emailsRepo, idGen);
        return {
            useCase,
            emailsRepo: emailsRepo as unknown as { create: jest.Mock; countSentOn: jest.Mock },
            countSentOn: (emailsRepo as unknown as { countSentOn: jest.Mock }).countSentOn,
            configRepo: configRepo as unknown as { findConfiguration: jest.Mock },
            idGen: idGen as unknown as { generateShortCode: jest.Mock; generateUuid: jest.Mock },
        };
    };

    const input = (to: string[]) => ({
        to,
        subject: 'Difusion masiva',
        html: '<p>hola</p>',
    });

    it('creates one QUEUED emails row per recipient with short code and DB-side uuid (code does not send email_uuid)', async () => {
        const { useCase, emailsRepo, countSentOn, idGen } = build();

        const result = await useCase.run({ data: input(['a@test.local', 'b@test.local']) });

        expect(result.queued).toBe(2);
        expect(result.short_codes).toEqual(['NX-BBBBBB1', 'NX-BBBBBB2']);
        expect(emailsRepo.create).toHaveBeenCalledTimes(2);
        expect(emailsRepo.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
            short_code: shortCode,
            id_client: null,
            from_email: config.sender_email,
            to_email: 'a@test.local',
            subject: input(['a@test.local']).subject,
            state: EmailStateEnum.QUEUED,
            attempts: 0,
            next_retry_at: null,
            sent_at: null,
        }));
        expect(emailsRepo.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ to_email: 'b@test.local' }));
        expect(emailsRepo.create.mock.calls.every((call: unknown[]) => call[0].email_uuid === undefined)).toBe(true);
        expect(idGen.generateShortCode).toHaveBeenCalledTimes(2);
        expect(idGen.generateUuid).not.toHaveBeenCalled();
        expect(countSentOn).toHaveBeenCalledTimes(1);
    });

    it('throws ActionNotAllowedException when the remaining daily budget is zero', async () => {
        const { useCase, emailsRepo } = build({ config: { ...config, daily_send_limit: 10 }, sentToday: 10 });

        await expect(useCase.run({ data: input(['a@test.local']) })).rejects.toBeInstanceOf(ActionNotAllowedException);
        await expect(useCase.run({ data: input(['a@test.local']) })).rejects.toThrow(/presupuesto|limite/i);
        expect(emailsRepo.create).not.toHaveBeenCalled();
    });

    it('throws ActionNotAllowedException when recipients exceed the remaining budget (partial fit rejected)', async () => {
        const { useCase, emailsRepo } = build({ config: { ...config, daily_send_limit: 10 }, sentToday: 8 });

        await expect(useCase.run({ data: input(['a@test.local', 'b@test.local', 'c@test.local']) })).rejects.toBeInstanceOf(ActionNotAllowedException);
        expect(emailsRepo.create).not.toHaveBeenCalled();
    });

    it('queues every recipient when the request fits exactly the remaining budget', async () => {
        const { useCase, emailsRepo } = build({ config: { ...config, daily_send_limit: 10 }, sentToday: 8 });

        const result = await useCase.run({ data: input(['a@test.local', 'b@test.local']) });

        expect(result.queued).toBe(2);
        expect(emailsRepo.create).toHaveBeenCalledTimes(2);
    });

    it('applies no daily budget when the configuration has no daily_send_limit', async () => {
        const { useCase, emailsRepo } = build({ config: { ...config, daily_send_limit: null } });

        const result = await useCase.run({ data: input(['a@test.local', 'b@test.local', 'c@test.local']) });

        expect(result.queued).toBe(3);
        expect(emailsRepo.countSentOn).not.toHaveBeenCalled();
        expect(emailsRepo.create).toHaveBeenCalledTimes(3);
    });

    it('throws when no configuration exists', async () => {
        const { useCase } = build({ config: null });
        await expect(useCase.run({ data: input(['a@test.local']) })).rejects.toThrow(/configura/i);
    });
});
