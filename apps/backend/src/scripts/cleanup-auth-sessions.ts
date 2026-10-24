import { PrismaPg } from '@prisma/adapter-pg';

import { requireDatabaseUrl } from '../database/environment';
import { PrismaClient } from '../generated/prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireDatabaseUrl() }),
  });

  try {
    await prisma.authSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            revokedAt: {
              lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        ],
      },
    });
    await prisma.loginFailure.deleteMany({
      where: {
        updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }],
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Auth session cleanup failed:', error);
  process.exitCode = 1;
});
