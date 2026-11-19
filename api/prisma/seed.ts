/**
 * Seed Kategori bawaan aplikasi (userId = null, isDefault = true).
 *
 * Daftar ini sengaja tetap: Transport, Konsumsi, Akomodasi, Tiket, Lain-lain.
 * Pengguna boleh menambah Kategori sendiri, tetapi tidak boleh menghapus
 * yang bawaan.
 *
 * Jalankan dengan: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = ['Transport', 'Konsumsi', 'Akomodasi', 'Tiket', 'Lain-lain'] as const;

async function main(): Promise<void> {
  for (const name of DEFAULT_CATEGORIES) {
    // Kategori bawaan punya userId = null, dan NULL tidak unik di Postgres —
    // jadi upsert lewat findFirst, bukan compound unique.
    const existing = await prisma.category.findFirst({
      where: { name, userId: null },
      select: { id: true },
    });

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { isDefault: true },
      });
      console.log(`• Kategori bawaan "${name}" sudah ada`);
      continue;
    }

    await prisma.category.create({
      data: { name, isDefault: true, userId: null },
    });
    console.log(`✓ Kategori bawaan "${name}" dibuat`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seed gagal:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
