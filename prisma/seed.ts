import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { AppEnvs as _env } from '../src/infrastructure/environments/app-env.config'
import { HashGeneratorTools } from 'src/infrastructure/helpers/hash-generator.helper';
import { colors } from '@gamastudio/colorslog'

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: String(process.env.DATABASE_URL),
    }),
});

async function main() {
    colors.info('Seeding admin_user...', { dateShow: false });

    const hashGenerator = new HashGeneratorTools();

    const hashPassword = hashGenerator.SHA256(_env.ADMIN_PASSWORD);

    const adminUser = await prisma.admin_user.create({
        data: {
            name: 'Admin',
            surname: 'Nexlify',
            username: _env.ADMIN_USER,
            password: hashPassword,
            ip_connection: null,
            auth_token: null,
            recovery_toke_data: null,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        },
    });

    colors.success('admin_user created', { dateShow: false });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });