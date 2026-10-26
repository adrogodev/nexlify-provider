import 'reflect-metadata';
import { ForgotPasswordUseCase } from './index';

const APP_CONFIG = {
    JWT_SECRET_KEY: 'jwt-secret',
    JWT_EXPIRATION_TIME: 2,
    ENCRYPT_KEY: 'encrypt-secret',
    PLATFORM_URL: 'https://platform.nexlify.com',
};

describe('ForgotPasswordUseCase', () => {
    const makeCredsRepo = (creds: unknown) => ({
        findByClientByUsername: jest.fn(async () => creds),
        update: jest.fn(async (_id: bigint, data: any) => data),
    });
    const makeClientRepo = (client: unknown) => ({ getByIdAsync: jest.fn(async () => client) });
    const jwt = { createTokenWithExpiration: jest.fn(() => 'jwt-recovery-token') } as never;
    const encrypter = { encrypt: jest.fn(() => 'encrypted-recovery-token') } as never;
    const configRepo = {
        findConfiguration: jest.fn(async () => ({ sender_email: 'sender@n.com', mail_application_password: 'app-pass', id_smtp_server: 1n })),
    };
    const smtpRepo = { getByIdAsync: jest.fn(async () => ({ host: 'smtp.n.com', port: 465 })) };
    const mailerService = { send: jest.fn(async () => ({ ok: true, message: 'sent' })) };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const makeUseCase = (credsRepo: any, clientRepo: any) =>
        new ForgotPasswordUseCase(
            credsRepo,
            clientRepo,
            jwt,
            encrypter,
            configRepo as never,
            smtpRepo as never,
            mailerService as never,
            APP_CONFIG as never,
        );

    it('stores the encrypted recovery token and sends the reset email for an existing username', async () => {
        const creds = { id_client_credential: 3n, id_client: 10n, username: 'client', recovery_token: null };
        const credsRepo = makeCredsRepo(creds);
        const clientRepo = makeClientRepo({ id_client: 10n, email: 'client@x.com' });

        await makeUseCase(credsRepo, clientRepo).run({ data: { username: 'client' } } as never);

        const created = (jwt as any).createTokenWithExpiration.mock.calls[0][0];
        expect(created.key).toBe(APP_CONFIG.JWT_SECRET_KEY);
        expect(created.expiresIn).toBe('30m');
        expect(created.data.id_user).toBe(10);
        expect(created.data.is_admin).toBe(false);
        expect(created.data.jti).toHaveLength(36);

        expect((encrypter as any).encrypt).toHaveBeenCalledWith('jwt-recovery-token', APP_CONFIG.ENCRYPT_KEY);
        expect(credsRepo.update).toHaveBeenCalledWith(3n, expect.objectContaining({ recovery_token: 'encrypted-recovery-token' }));

        expect(mailerService.send).toHaveBeenCalledTimes(1);
        const payload = mailerService.send.mock.calls[0][0];
        expect(payload.transporter).toEqual({ host: 'smtp.n.com', port: 465, secure: true, user: 'sender@n.com', password: 'app-pass' });
        expect(payload.email.from).toBe('sender@n.com');
        expect(payload.email.to).toBe('client@x.com');
        expect(payload.email.html).toContain(`${APP_CONFIG.PLATFORM_URL}`);
        expect(payload.email.html).toContain('encrypted-recovery-token');
    });

    it('resolves without touching storage or the mailer when the username is unknown', async () => {
        const credsRepo = makeCredsRepo(null);
        const clientRepo = makeClientRepo(null);

        await expect(makeUseCase(credsRepo, clientRepo).run({ data: { username: 'ghost' } } as never)).resolves.not.toThrow();

        expect((jwt as any).createTokenWithExpiration).not.toHaveBeenCalled();
        expect(credsRepo.update).not.toHaveBeenCalled();
        expect(mailerService.send).not.toHaveBeenCalled();
    });
});
