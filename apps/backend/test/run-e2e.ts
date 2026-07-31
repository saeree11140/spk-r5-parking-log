import { spawnSync } from 'node:child_process';

import { Client } from 'pg';

import {
  requireDatabaseUrl,
  requireTestDatabaseUrl,
} from '../src/database/environment';

function testDatabaseUrl(): string {
  const configured = process.env.E2E_DATABASE_URL?.trim();
  if (configured) {
    return requireTestDatabaseUrl({ DATABASE_URL: configured });
  }

  const parsed = new URL(requireDatabaseUrl());
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  parsed.pathname = `/${encodeURIComponent(`${databaseName}_test`)}`;

  return requireTestDatabaseUrl({ DATABASE_URL: parsed.toString() });
}

async function ensureDatabase(databaseUrl: string): Promise<void> {
  const parsed = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
    throw new Error(
      'E2E database name may contain only letters, numbers and _',
    );
  }

  const adminUrl = new URL(parsed);
  adminUrl.pathname = '/postgres';
  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const existing = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName],
    );
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await client.end();
  }
}

function run(command: string, args: string[], environment: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    env: environment,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function main(): Promise<void> {
  const databaseUrl = testDatabaseUrl();
  await ensureDatabase(databaseUrl);
  const environment = {
    ...process.env,
    ADMIN_DISPLAY_NAME:
      process.env.ADMIN_DISPLAY_NAME ?? 'E2E Seed Administrator',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? 'E2eSeedPassword123',
    ADMIN_USERNAME: process.env.ADMIN_USERNAME ?? 'e2e_seed_admin',
    DATABASE_URL: databaseUrl,
  };

  run('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], environment);
  run('pnpm', ['exec', 'prisma', 'db', 'seed'], environment);
  run(
    'pnpm',
    [
      'exec',
      'jest',
      '--config',
      './test/jest-e2e.json',
      ...process.argv.slice(2),
    ],
    {
      ...environment,
      NODE_OPTIONS: '--experimental-vm-modules --no-warnings',
    },
  );
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Unable to prepare E2E database',
  );
  process.exitCode = 1;
});
