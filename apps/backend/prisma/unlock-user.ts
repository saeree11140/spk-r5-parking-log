import { PrismaPg } from '@prisma/adapter-pg';

import { unlockUser } from '../src/auth/unlock-user';
import { requireDatabaseUrl } from '../src/database/environment';
import { PrismaClient } from '../src/generated/prisma/client';

async function main(): Promise<void> {
  const username = process.argv[2]?.trim();
  if (!username) {
    console.error('Usage: pnpm --filter backend auth:unlock <username>');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireDatabaseUrl() }),
  });

  try {
    if (await unlockUser(prisma, username)) {
      console.log(`Unlocked ${username}`);
    } else {
      console.error(`User not found: ${username}`);
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Unlock failed:', error);
  process.exitCode = 1;
});
