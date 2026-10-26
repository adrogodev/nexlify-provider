const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    }),
});

(async () => {
    const deliveries = await prisma.$queryRawUnsafe(`SELECT id_delivery::text AS id, id_endpoint::text AS endpoint, event, attempt, ok, status_code, error, next_retry_at, payload IS NOT NULL AS has_payload FROM webhook_deliveries ORDER BY id_delivery`);
    console.log('DELIVERIES:', JSON.stringify(deliveries, null, 1));
    console.log('NOW:', new Date().toISOString());
    await prisma.$disconnect();
})();
