import 'reflect-metadata';
process.env.NODE_ENV = 'development';

// app-env.config reads env-var at import time and Jest forces NODE_ENV=test,
// so every module that transitively touches it loads dynamically here.
let AuthenticatedUserSecurity: any;
let TokenData: any;
let TokenInfo: any;

beforeAll(async () => {
    ({ TokenData } = await import('src/core/domain/models/token-data.model'));
    ({ TokenInfo } = await import('src/core/domain/models/token-info'));
    ({ AuthenticatedUserSecurity } = await import('./authenticated-user.security'));
});

describe('AuthenticatedUserSecurity', () => {
    const adminUser = {
        id_user: 1n,
        name: 'Admin',
        surname: 'Nexlify',
        username: 'admin',
        password: 'x',
        ip_connection: null,
        auth_token: null,
        is_active: true,
        created_at: null,
        updated_at: null,
    };

    /** A client whose id_client collides with the admin's id_user (the reported bug). */
    const silverClient = {
        id_client: 1n,
        id_client_state: 2,
        id_type: null,
        id_number: '1234567891',
        name: 'SILVER',
        email: 'silver@test.local',
        cell_callsign: null,
        cell_phone: null,
        user_first_name: null,
        user_second_name: null,
        user_first_surname: null,
        user_second_surname: null,
        created_at: null,
        updated_at: null,
    };

    const makeRepos = ({ clients, admins }: { clients: unknown; admins: unknown }) => {
        const clientRepo = { getByIdAsync: jest.fn(async () => clients) };
        const adminRepo = { getByIdAsync: jest.fn(async () => admins) };
        return { clientRepo, adminRepo };
    };

    const jwtReturning = (is_admin: boolean) => ({
        getDataToken: jest.fn(() => TokenData.create({ data: { payload: TokenInfo.create({ jti: null, ip_connection: '::1', id_user: 1, is_admin }) }, isExpired: false, isNotValid: false })),
        createTokenWithExpiration: jest.fn(),
        createTokenWithoutExpiration: jest.fn(),
    } as never);

    it('resolves an admin by the is_admin claim WITHOUT consulting the clients table (id collision safe)', async () => {
        const { clientRepo, adminRepo } = makeRepos({ clients: silverClient, admins: adminUser });
        const security = new AuthenticatedUserSecurity(jwtReturning(true), adminRepo as never, clientRepo as never);

        const result = await security.run('Bearer token', '::1');

        expect(clientRepo.getByIdAsync).not.toHaveBeenCalled();
        expect((result.auth_data as any).is_admin).toBe(true);
    });

    it('resolves a client by the is_admin claim WITHOUT consulting the admins table', async () => {
        const activeClient = { ...silverClient, id_client_state: 1 };
        const { clientRepo, adminRepo } = makeRepos({ clients: activeClient, admins: adminUser });
        const security = new AuthenticatedUserSecurity(jwtReturning(false), adminRepo as never, clientRepo as never);

        const result = await security.run('Bearer token', '::1');

        expect(adminRepo.getByIdAsync).not.toHaveBeenCalled();
        expect((result.auth_data as any).is_admin).toBe(false);
    });

    it('still denies an inactive admin (is_admin claim path)', async () => {
        const { clientRepo, adminRepo } = makeRepos({ clients: null, admins: { ...adminUser, is_active: false } });
        const security = new AuthenticatedUserSecurity(jwtReturning(true), adminRepo as never, clientRepo as never);

        await expect(security.run('Bearer token', '::1')).rejects.toBeTruthy();
    });

    it('still denies an inactive client (is_admin claim path)', async () => {
        const { clientRepo, adminRepo } = makeRepos({ clients: { ...silverClient, id_client_state: 2 }, admins: null });
        const security = new AuthenticatedUserSecurity(jwtReturning(false), adminRepo as never, clientRepo as never);

        await expect(security.run('Bearer token', '::1')).rejects.toBeTruthy();
    });

    it('still demands matching ip for admins', async () => {
        const { clientRepo, adminRepo } = makeRepos({ clients: null, admins: adminUser });
        const security = new AuthenticatedUserSecurity(jwtReturning(true), adminRepo as never, clientRepo as never);

        await expect(security.run('Bearer token', '9.9.9.9')).rejects.toBeTruthy();
    });
});
