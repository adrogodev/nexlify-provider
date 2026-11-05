import { colors } from '@gamastudio/colorslog';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { LATAM_TEMPLATES } from '../src/infrastructure/seeds/latam-templates';

/**
 * Idempotent seed of the LatAm Spanish templates (S3): upsert by `name`.
 * Existing rows get the seeded subject/body/variables/category/locale; their
 * `is_active` toggle is preserved.
 */
const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: String(process.env.DATABASE_URL),
    }),
});

async function main() {
    colors.info('Seeding LatAm templates...', { dateShow: false });

    for (const seed of LATAM_TEMPLATES) {
        const data = {
            subject: seed.subject,
            template: seed.template,
            variables: JSON.stringify(seed.variables),
            category: seed.category,
            locale: seed.locale,
        };

        const existing = await prisma.templates.findFirst({ where: { name: seed.name } });
        if (existing) {
            await prisma.templates.update({
                where: { id_template: existing.id_template },
                data: { ...data, updated_at: new Date() },
            });
            colors.info(`template updated: ${seed.name}`, { dateShow: false });
        } else {
            await prisma.templates.create({ data: { name: seed.name, is_active: true, ...data } });
            colors.success(`template created: ${seed.name}`, { dateShow: false });
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
