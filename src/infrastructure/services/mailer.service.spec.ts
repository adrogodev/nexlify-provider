jest.mock('nodemailer', () => ({
    __esModule: true,
    default: {
        createTransport: jest.fn(),
    },
    createTransport: jest.fn(),
}));

import * as nodemailer from "nodemailer";
import { MailerService } from './mailer.service';

const createTransportMock = nodemailer.createTransport as jest.Mock;

describe('MailerService', () => {
    let service: MailerService;
    const originalEnv = process.env['MAILER_TLS_REJECT_UNAUTHORIZED'];

    beforeEach(() => {
        service = new MailerService();
        createTransportMock.mockReset();
    });

    afterAll(() => {
        if (originalEnv === undefined) {
            delete process.env['MAILER_TLS_REJECT_UNAUTHORIZED'];
        } else {
            process.env['MAILER_TLS_REJECT_UNAUTHORIZED'] = originalEnv;
        }
    });

    it('rejects invalid TLS certificates by default', async () => {
        delete process.env['MAILER_TLS_REJECT_UNAUTHORIZED'];
        createTransportMock.mockImplementation(() => ({ verify: jest.fn().mockResolvedValue(true), sendMail: jest.fn().mockResolvedValue({}) }));

        await service.send({
            transporter: { host: 'smtp.test.local', port: 587, secure: false, user: 'u', password: 'p' },
            email: { from: 'from@test.local', to: 'to@test.local', subject: 's', text: 't' },
        });

        const createArgs = createTransportMock.mock.calls[0][0];
        expect(createArgs.tls.rejectUnauthorized).toBe(true);
    });

    it('rejects invalid TLS certificates when configured to do so', async () => {
        process.env['MAILER_TLS_REJECT_UNAUTHORIZED'] = 'true';
        createTransportMock.mockImplementation(() => ({ verify: jest.fn().mockResolvedValue(true), sendMail: jest.fn().mockResolvedValue({}) }));

        await service.send({
            transporter: { host: 'smtp.test.local', port: 587, secure: false, user: 'u', password: 'p' },
            email: { from: 'from@test.local', to: 'to@test.local', subject: 's', text: 't' },
        });

        const createArgs = createTransportMock.mock.calls[0][0];
        expect(createArgs.tls.rejectUnauthorized).toBe(true);
    });

    it('allows invalid TLS certificates when explicitly configured to', async () => {
        process.env['MAILER_TLS_REJECT_UNAUTHORIZED'] = 'false';
        createTransportMock.mockImplementation(() => ({ verify: jest.fn().mockResolvedValue(true), sendMail: jest.fn().mockResolvedValue({}) }));

        await service.send({
            transporter: { host: 'smtp.test.local', port: 587, secure: false, user: 'u', password: 'p' },
            email: { from: 'from@test.local', to: 'to@test.local', subject: 's', text: 't' },
        });

        const createArgs = createTransportMock.mock.calls[0][0];
        expect(createArgs.tls.rejectUnauthorized).toBe(false);
    });

    it('no longer pins the deprecated SSLv3 cipher list', async () => {
        delete process.env['MAILER_TLS_REJECT_UNAUTHORIZED'];
        createTransportMock.mockImplementation(() => ({ verify: jest.fn().mockResolvedValue(true), sendMail: jest.fn().mockResolvedValue({}) }));

        await service.send({
            transporter: { host: 'smtp.test.local', port: 587, secure: false, user: 'u', password: 'p' },
            email: { from: 'from@test.local', to: 'to@test.local', subject: 's', text: 't' },
        });

        const createArgs = createTransportMock.mock.calls[0][0];
        expect(createArgs.tls.ciphers).toBeUndefined();
    });

    it('exposes the nodemailer messageId in the successful result', async () => {
        createTransportMock.mockImplementation(() => ({
            verify: jest.fn().mockResolvedValue(true),
            sendMail: jest.fn().mockResolvedValue({ messageId: '<ok@server.local>' }),
        }));

        const result = await service.send({
            transporter: { host: 'smtp.test.local', port: 587, secure: false, user: 'u', password: 'p' },
            email: { from: 'from@test.local', to: 'to@test.local', subject: 's', text: 't' },
        });

        expect(result).toEqual({
            ok: true,
            message: 'Correo enviado con exito',
            messageId: '<ok@server.local>',
        });
    });

    it('keeps the successful result graceful when the send response has no messageId', async () => {
        createTransportMock.mockImplementation(() => ({
            verify: jest.fn().mockResolvedValue(true),
            sendMail: jest.fn().mockResolvedValue({}),
        }));

        const result = await service.send({
            transporter: { host: 'smtp.test.local', port: 587, secure: false, user: 'u', password: 'p' },
            email: { from: 'from@test.local', to: 'to@test.local', subject: 's', text: 't' },
        });

        expect(result.ok).toBe(true);
        expect(result.message).toBe('Correo enviado con exito');
        expect(result.messageId).toBeUndefined();
    });

    it('never reports a messageId on failure', async () => {
        createTransportMock.mockImplementation(() => ({
            verify: jest.fn().mockResolvedValue(true),
            sendMail: jest.fn().mockRejectedValue(new Error('smtp down')),
        }));

        const result = await service.send({
            transporter: { host: 'smtp.test.local', port: 587, secure: false, user: 'u', password: 'p' },
            email: { from: 'from@test.local', to: 'to@test.local', subject: 's', text: 't' },
        });

        expect(result.ok).toBe(false);
        expect(result.messageId).toBeUndefined();
    });
});
