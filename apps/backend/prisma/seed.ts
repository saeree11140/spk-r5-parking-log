import { PrismaPg } from '@prisma/adapter-pg';

import { PasswordService } from '../src/auth/password.service';
import { seedAdmin } from '../src/database/admin-seed';
import { requireDatabaseUrl } from '../src/database/environment';
import { seedHouses } from '../src/database/house-seed';
import { PrismaClient } from '../src/generated/prisma/client';

function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireDatabaseUrl() }),
  });
  const admin = {
    username: requireEnvironment('ADMIN_USERNAME'),
    password: requireEnvironment('ADMIN_PASSWORD'),
    displayName: requireEnvironment('ADMIN_DISPLAY_NAME'),
  };

  try {
    await seedHouses(prisma);
    await seedAdmin(prisma, admin, new PasswordService());
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Database seed failed:', error);
  process.exitCode = 1;
});
