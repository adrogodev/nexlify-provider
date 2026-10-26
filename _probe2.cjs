const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    }),
});

(async () => {
    try {
        const r = await prisma.$queryRawUnsafe('SELECT 1 AS ok');
        console.log('PING OK', JSON.stringify(r));
    } catch (e) {
        console.error('PING FAIL', e && e.message, '| code:', e && e.code, '| meta:', e && JSON.stringify(e.meta));
    }
    try {
        const r = await prisma.$queryRawUnsafe('SELECT count(*)::int AS c FROM id_types');
        console.log('id_types:', JSON.stringify(r));
    } catch (e) {
        console.error('COUNT FAIL:', e && e.message, '| code:', e && e.code);
    }
    await prisma.$disconnect();
})();
