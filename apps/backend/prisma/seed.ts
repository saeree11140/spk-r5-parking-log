import { PrismaPg } from '@prisma/adapter-pg';

import { requireDatabaseUrl } from '../src/database/environment';
import { seedHouses } from '../src/database/house-seed';
import { PrismaClient } from '../src/generated/prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireDatabaseUrl() }),
  });

  try {
    await seedHouses(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Database seed failed:', error);
  process.exitCode = 1;
});
