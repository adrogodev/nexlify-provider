import { SendEmailUseCase } from './send-email.usecase';

describe('SendEmailUseCase', () => {
    const configuration = {
        id_configuration: 1n,
        sender_email: 'sender@nexlify.local',
        sender_name: 'Nexlify',
        mail_application_password: 'app-password',
        id_smtp_server: 5n,
    };

    const smtpServer = {
        id_smpt_server: 5n,
        host: 'smtp.nexlify.local',
        port: 587,
        auth_type: 'basic',
        state: true,
    };

    const mailer = { send: jest.fn(async () => true) } as never;

    const makeUseCase = (config: unknown, server: unknown) => {
        const configRepo = { findConfiguration: jest.fn(async () => config) } as never;
        const smtpRepo = { getByIdAsync: jest.fn(async () => server) } as never;
        return new SendEmailUseCase(configRepo, smtpRepo, mailer);
    };

    const input = {
        from: 'sender@nexlify.local',
        to: 'dest@test.local',
        subject: 'Hola',
        text: 'mensaje',
    };

    it('throws when no platform configuration exists', async () => {
        const useCase = makeUseCase(null, smtpServer);
        await expect(useCase.run({ data: input } as never)).rejects.toThrow(/configuraci/i);
    });

    it('throws when the configuration has no SMTP server linked', async () => {
        const useCase = makeUseCase({ ...configuration, id_smtp_server: null }, smtpServer);
        await expect(useCase.run({ data: input } as never)).rejects.toThrow(/configura/i);
    });

    it('throws when the linked SMTP server does not exist', async () => {
        const useCase = makeUseCase(configuration, null);
        await expect(useCase.run({ data: input } as never)).rejects.toThrow(/configura/i);
    });

    it('sends email using SMTP credentials from the global configuration', async () => {
        const useCase = makeUseCase(configuration, smtpServer);

        const result = await useCase.run({ data: input } as never);

        expect(result).toBe(true);
        expect((mailer.send as unknown as jest.Mock).mock.calls[0][0].transporter).toEqual({
            host: 'smtp.nexlify.local',
            port: 587,
            secure: false,
            user: 'sender@nexlify.local',
            password: 'app-password',
        });
    });

    it('reports failure when the mail service cannot deliver', async () => {
        (mailer.send as unknown as jest.Mock).mockImplementationOnce(async () => false);
        const useCase = makeUseCase(configuration, smtpServer);

        const result = await useCase.run({ data: input } as never);

        expect(result).toBe(false);
    });
});
