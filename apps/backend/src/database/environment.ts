import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../../../../.env'), quiet: true });

export function requireDatabaseUrl(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const databaseUrl = environment.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }

  return databaseUrl;
}
