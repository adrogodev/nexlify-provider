import { SmtpServerExistsGuard } from './smtp-server-exists.guard';
import { ConfigurationExistsGuard } from './configuration-exists.guard';
import { AlreadyExistsException } from 'src/core/domain/exceptions';

describe('SmtpServerExistsGuard', () => {
    const makeGuard = (configuration: unknown) => new SmtpServerExistsGuard({ findConfiguration: jest.fn(async () => configuration) } as never);

    it('denies when no platform configuration exists at all', async () => {
        const guard = makeGuard(null);
        await expect(guard.canActivate({} as never)).rejects.toThrow(AlreadyExistsException);
    });

    it('denies when the configuration exists but has no SMTP server selected', async () => {
        const guard = makeGuard({ id_smtp_server: null });
        await expect(guard.canActivate({} as never)).rejects.toThrow(AlreadyExistsException);
    });

    it('allows when the configuration has an SMTP server', async () => {
        const guard = makeGuard({ id_smtp_server: 1 });
        await expect(guard.canActivate({} as never)).resolves.toBe(true);
    });
});

describe('ConfigurationExistsGuard', () => {
    const makeGuard = (configuration: unknown) => new ConfigurationExistsGuard({ findConfiguration: jest.fn(async () => configuration) } as never);

    it('denies when no platform configuration exists', async () => {
        const guard = makeGuard(null);
        await expect(guard.canActivate({} as never)).rejects.toThrow(AlreadyExistsException);
        await expect(guard.canActivate({} as never)).rejects.toThrow(/No se ha realizado la configuración/u);
    });

    it('allows when the configuration exists', async () => {
        const guard = makeGuard({ id_configuration: 1 });
        await expect(guard.canActivate({} as never)).resolves.toBe(true);
    });
});
