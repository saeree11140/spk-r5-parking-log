# PostgreSQL, Prisma Schema และ Seed บ้าน 164 หลัง Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่ม PostgreSQL, Prisma 7, Initial Migration, DatabaseModule และ Seed บ้าน `R5-001` ถึง `R5-164` ที่รันซ้ำได้

**Architecture:** Docker Compose รัน PostgreSQL เพียง Service เดียว Prisma Schema เป็น Source of Truth ของ Domain Data และใช้ SQL Migration เสริม Partial Index/Check Constraints NestJS เชื่อมผ่าน `PrismaService` และ `@prisma/adapter-pg`; Seed Logic แยกเป็นฟังก์ชันทดสอบได้

**Tech Stack:** Node.js 22 LTS, pnpm, NestJS 11, TypeScript, Jest, PostgreSQL 18.4, Docker Compose, Prisma ORM 7, `@prisma/adapter-pg`, `pg`

## Global Constraints

- ทำงานใน Root `spk-r5-parking-log` ปัจจุบัน ห้ามสร้าง Project Root ซ้อน
- Docker Compose มี PostgreSQL เท่านั้น ใช้ `postgres:18.4-alpine3.23`
- Named Volume Mount ที่ `/var/lib/postgresql`
- Prisma 7 ใช้ Driver Adapter; Generated Client อยู่ `apps/backend/src/generated/prisma` และใช้ CommonJS
- Prisma Model/Field ใช้ `PascalCase`/`camelCase`; PostgreSQL Table/Column ใช้ `snake_case`
- UUID เป็น Primary Key; เงินเป็น Integer หน่วยบาท; ห้ามใช้ Floating Point
- แต่ละบ้านมี `OPEN` Cycle สูงสุดหนึ่งรอบ
- ข้อมูลธุรกิจใช้ `ON DELETE RESTRICT`; ไม่สร้าง Hard-delete Workflow
- Seed สร้าง `R5-001` ถึง `R5-164`, รันซ้ำได้ และห้ามเขียนทับข้อมูลบ้านเดิม
- ห้ามเพิ่ม CRUD API, Business Calculation Service, Authentication, Object Storage, Frontend Integration หรือ Production Secret
- ใช้ Node จาก `$HOME/.nvm/versions/node/v22.17.0/bin` สำหรับทุกคำสั่ง pnpm ในเครื่องนี้

---

## File Structure

- `compose.yaml`: PostgreSQL Local Development Service
- `.env.example`: รายการ Environment Variables ที่ต้องใช้
- `apps/backend/prisma.config.ts`: Prisma CLI Configuration และ Seed Command
- `apps/backend/prisma/schema.prisma`: Domain Models, Enums, Relations, Prisma Indexes
- `apps/backend/prisma/migrations/202607190001_init_parking_domain/migration.sql`: Initial PostgreSQL DDL และ Constraints ที่ Prisma แสดงไม่ได้
- `apps/backend/prisma/seed.ts`: Seed CLI Entrypoint และ Resource Cleanup
- `apps/backend/src/database/environment.ts`: โหลด Root `.env` และ Validate `DATABASE_URL`
- `apps/backend/src/database/prisma.service.ts`: Nest Lifecycle Wrapper ของ Prisma Client
- `apps/backend/src/database/database.module.ts`: Global Database Provider
- `apps/backend/src/database/house-seed.ts`: สร้าง Seed Rows และ Idempotent Upsert
- `apps/backend/src/database/environment.spec.ts`: Unit Tests สำหรับ Environment Validation
- `apps/backend/src/database/house-seed.spec.ts`: Unit Tests สำหรับชุดบ้าน 164 หลัง
- `apps/backend/test/database.e2e-spec.ts`: Connectivity, Migration และ Seed Idempotency Tests
- `apps/backend/src/app.module.ts`: Import Database Module
- `apps/backend/package.json`: Prisma Dependencies และ Scripts
- `package.json`: Root Database Commands
- `.gitignore`: Ignore Generated Prisma Client
- `README.md`: วิธีเริ่ม Database, Migration และ Seed

---

### Task 1: PostgreSQL Local Infrastructure และ Prisma Toolchain

**Files:**

- Create: `compose.yaml`
- Modify: `.env.example`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `apps/backend/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: Docker Compose, Root Environment
- Produces: PostgreSQL ที่ Healthy บน Port 5432 และ Prisma 7 CLI/Runtime Dependencies

- [ ] **Step 1: เพิ่ม Compose และ Environment Configuration**

สร้าง `compose.yaml`:

```yaml
services:
  postgres:
    image: postgres:18.4-alpine3.23
    container_name: spk-r5-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-spk_r5_parking_log}
      POSTGRES_USER: ${POSTGRES_USER:-spk_r5}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-spk_r5_local}
    ports:
      - '${POSTGRES_PORT:-5432}:5432'
    volumes:
      - postgres_data:/var/lib/postgresql
    healthcheck:
      test:
        ['CMD-SHELL', 'pg_isready -U "$${POSTGRES_USER}" -d "$${POSTGRES_DB}"']
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 5s

volumes:
  postgres_data:
```

เพิ่มท้าย `.env.example`:

```dotenv

# PostgreSQL
POSTGRES_DB=spk_r5_parking_log
POSTGRES_USER=spk_r5
POSTGRES_PASSWORD=spk_r5_local
POSTGRES_PORT=5432
DATABASE_URL=postgresql://spk_r5:spk_r5_local@localhost:5432/spk_r5_parking_log
```

เพิ่ม `.gitignore`:

```gitignore

# generated Prisma client
apps/backend/src/generated/prisma/
```

- [ ] **Step 2: เพิ่ม Dependencies และ Scripts**

Run:

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm --filter backend add @prisma/client@^7 @prisma/adapter-pg@^7 pg dotenv
pnpm --filter backend add --save-dev prisma@^7 tsx @types/pg
```

เพิ่ม scripts ใน `apps/backend/package.json`:

```json
"prisma:generate": "prisma generate",
"prisma:validate": "prisma validate",
"prisma:migrate": "prisma migrate deploy",
"prisma:seed": "prisma db seed",
"prisma:status": "prisma migrate status",
"prebuild": "prisma generate",
"pretest": "prisma generate",
"pretest:e2e": "prisma generate"
```

เพิ่ม scripts ใน Root `package.json`:

```json
"db:up": "docker compose up -d postgres",
"db:down": "docker compose down",
"db:migrate": "pnpm --filter backend prisma:migrate",
"db:seed": "pnpm --filter backend prisma:seed",
"db:status": "pnpm --filter backend prisma:status"
```

- [ ] **Step 3: ตรวจ Compose Configuration ก่อน Start**

Run:

```bash
cp .env.example .env
docker compose config --quiet
docker compose up -d postgres
docker compose ps postgres
```

Expected: `config --quiet` Exit 0; `postgres` แสดงสถานะ `healthy`

- [ ] **Step 4: ตรวจ PostgreSQL Connectivity**

Run:

```bash
docker compose exec postgres pg_isready -U spk_r5 -d spk_r5_parking_log
```

Expected:

```text
/var/run/postgresql:5432 - accepting connections
```

- [ ] **Step 5: Commit**

```bash
git add compose.yaml .env.example .gitignore package.json apps/backend/package.json pnpm-lock.yaml
git commit -m "chore: add PostgreSQL and Prisma toolchain"
```

### Task 2: Prisma Domain Schema และ Initial Migration

**Files:**

- Create: `apps/backend/prisma.config.ts`
- Create: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/migration_lock.toml`
- Create: `apps/backend/prisma/migrations/202607190001_init_parking_domain/migration.sql`

**Interfaces:**

- Consumes: `DATABASE_URL`, PostgreSQL จาก Task 1
- Produces: `PrismaClient`, 7 Domain Tables, 5 Enums, Foreign Keys, Indexes และ Database Constraints

- [ ] **Step 1: สร้าง Prisma Configuration**

สร้าง `apps/backend/prisma.config.ts`:

```ts
import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, env } from 'prisma/config';

const backendDirectory = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(backendDirectory, '../../.env'), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

- [ ] **Step 2: เขียน Schema แล้วตรวจว่า Constraints ครบ**

สร้าง `apps/backend/prisma/schema.prisma`:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}

enum CycleStatus {
  OPEN
  CLOSED

  @@map("cycle_status")
}

enum ViolationStatus {
  WARNING
  PENDING_FINE
  PAID
  CANCELLED

  @@map("violation_status")
}

enum FineStatus {
  PENDING
  PAID
  CANCELLED

  @@map("fine_status")
}

enum AuditAction {
  CREATE
  UPDATE
  CANCEL
  PAY
  RESEQUENCE

  @@map("audit_action")
}

enum AuditActorType {
  SYSTEM
  USER

  @@map("audit_actor_type")
}

model House {
  id                String           @id @default(uuid()) @db.Uuid
  code              String           @unique @db.VarChar(16)
  sequenceNumber    Int              @unique @map("sequence_number")
  actualHouseNumber String?          @map("actual_house_number") @db.VarChar(64)
  isActive          Boolean          @default(true) @map("is_active")
  createdAt         DateTime         @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt         DateTime         @updatedAt @map("updated_at") @db.Timestamptz(3)
  cycles            ViolationCycle[]

  @@map("houses")
}

model ViolationCycle {
  id          String             @id @default(uuid()) @db.Uuid
  houseId     String             @map("house_id") @db.Uuid
  cycleNumber Int                @map("cycle_number")
  status      CycleStatus        @default(OPEN)
  openedAt    DateTime           @default(now()) @map("opened_at") @db.Timestamptz(3)
  closedAt    DateTime?          @map("closed_at") @db.Timestamptz(3)
  createdAt   DateTime           @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt   DateTime           @updatedAt @map("updated_at") @db.Timestamptz(3)
  house       House              @relation(fields: [houseId], references: [id], onDelete: Restrict)
  violations  ParkingViolation[]
  fine        Fine?

  @@unique([houseId, cycleNumber])
  @@index([houseId])
  @@map("violation_cycles")
}

model ParkingViolation {
  id             String          @id @default(uuid()) @db.Uuid
  cycleId        String          @map("cycle_id") @db.Uuid
  sequenceNumber Int?            @map("sequence_number")
  occurredAt     DateTime        @map("occurred_at") @db.Timestamptz(3)
  status         ViolationStatus
  note           String?
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt      DateTime        @updatedAt @map("updated_at") @db.Timestamptz(3)
  cycle          ViolationCycle  @relation(fields: [cycleId], references: [id], onDelete: Restrict)
  evidence       Evidence[]

  @@unique([cycleId, sequenceNumber])
  @@index([cycleId])
  @@index([occurredAt])
  @@map("parking_violations")
}

model Fine {
  id         String         @id @default(uuid()) @db.Uuid
  cycleId    String         @unique @map("cycle_id") @db.Uuid
  amountBaht Int            @map("amount_baht")
  status     FineStatus
  createdAt  DateTime       @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt  DateTime       @updatedAt @map("updated_at") @db.Timestamptz(3)
  cycle      ViolationCycle @relation(fields: [cycleId], references: [id], onDelete: Restrict)
  payment    FinePayment?

  @@map("fines")
}

model FinePayment {
  id         String   @id @default(uuid()) @db.Uuid
  fineId     String   @unique @map("fine_id") @db.Uuid
  amountBaht Int      @map("amount_baht")
  paidAt     DateTime @map("paid_at") @db.Timestamptz(3)
  reference  String?  @db.VarChar(128)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  fine       Fine     @relation(fields: [fineId], references: [id], onDelete: Restrict)

  @@map("fine_payments")
}

model Evidence {
  id          String           @id @default(uuid()) @db.Uuid
  violationId String           @map("violation_id") @db.Uuid
  objectKey   String           @unique @map("object_key") @db.VarChar(512)
  fileName    String           @map("file_name") @db.VarChar(255)
  mimeType    String           @map("mime_type") @db.VarChar(128)
  sizeBytes   Int              @map("size_bytes")
  createdAt   DateTime         @default(now()) @map("created_at") @db.Timestamptz(3)
  violation   ParkingViolation @relation(fields: [violationId], references: [id], onDelete: Restrict)

  @@index([violationId])
  @@map("evidence")
}

model AuditLog {
  id         String         @id @default(uuid()) @db.Uuid
  entityType String         @map("entity_type") @db.VarChar(64)
  entityId   String         @map("entity_id") @db.Uuid
  action     AuditAction
  before     Json?
  after      Json?
  actorType  AuditActorType @default(SYSTEM) @map("actor_type")
  actorId    String?        @map("actor_id") @db.Uuid
  actorLabel String?        @map("actor_label") @db.VarChar(255)
  createdAt  DateTime       @default(now()) @map("created_at") @db.Timestamptz(3)

  @@index([entityType, entityId, createdAt])
  @@map("audit_logs")
}
```

- [ ] **Step 3: Validate Schema และ Generate Client**

Run:

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm --filter backend prisma:validate
pnpm --filter backend prisma:generate
```

Expected: `The schema at prisma/schema.prisma is valid` และ Prisma Client Generate สำเร็จ

- [ ] **Step 4: สร้าง Initial Migration**

สร้าง `apps/backend/prisma/migrations/migration_lock.toml`:

```toml
provider = "postgresql"
```

สร้าง DDL พื้นฐานจาก Schema:

```bash
mkdir -p apps/backend/prisma/migrations/202607190001_init_parking_domain
cd apps/backend
pnpm exec prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output prisma/migrations/202607190001_init_parking_domain/migration.sql
cd ../..
```

จากนั้นเพิ่มท้าย `apps/backend/prisma/migrations/202607190001_init_parking_domain/migration.sql`:

```sql
ALTER TABLE "houses"
  ADD CONSTRAINT "houses_sequence_number_positive" CHECK ("sequence_number" >= 1);

ALTER TABLE "violation_cycles"
  ADD CONSTRAINT "violation_cycles_cycle_number_positive" CHECK ("cycle_number" >= 1),
  ADD CONSTRAINT "violation_cycles_closed_at_matches_status" CHECK (
    ("status" = 'OPEN' AND "closed_at" IS NULL)
    OR ("status" = 'CLOSED' AND "closed_at" IS NOT NULL)
  );

ALTER TABLE "parking_violations"
  ADD CONSTRAINT "parking_violations_sequence_matches_status" CHECK (
    ("status" = 'CANCELLED' AND "sequence_number" IS NULL)
    OR ("status" <> 'CANCELLED' AND "sequence_number" >= 1)
  );

ALTER TABLE "fines"
  ADD CONSTRAINT "fines_amount_baht_non_negative" CHECK ("amount_baht" >= 0);

ALTER TABLE "fine_payments"
  ADD CONSTRAINT "fine_payments_amount_baht_positive" CHECK ("amount_baht" > 0);

ALTER TABLE "evidence"
  ADD CONSTRAINT "evidence_size_bytes_non_negative" CHECK ("size_bytes" >= 0);

CREATE UNIQUE INDEX "violation_cycles_one_open_per_house"
  ON "violation_cycles" ("house_id")
  WHERE "status" = 'OPEN';
```

- [ ] **Step 5: Apply Migration และตรวจ Status**

Run:

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm db:migrate
pnpm db:status
```

Expected: Migration `202607190001_init_parking_domain` Applied; `Database schema is up to date!`

- [ ] **Step 6: Commit**

```bash
git add apps/backend/prisma.config.ts apps/backend/prisma
git commit -m "feat: add parking domain Prisma schema"
```

### Task 3: NestJS DatabaseModule และ Environment Validation แบบ Test-first

**Files:**

- Create: `apps/backend/src/database/environment.spec.ts`
- Create: `apps/backend/src/database/environment.ts`
- Create: `apps/backend/src/database/prisma.service.ts`
- Create: `apps/backend/src/database/database.module.ts`
- Modify: `apps/backend/src/app.module.ts`
- Modify: `apps/backend/tsconfig.build.json`
- Modify: `apps/backend/eslint.config.mjs`

**Interfaces:**

- Consumes: Generated `PrismaClient`, `DATABASE_URL`
- Produces: `requireDatabaseUrl(environment?: NodeJS.ProcessEnv): string`, Injectable `PrismaService`, Global `DatabaseModule`

- [ ] **Step 1: เขียน Failing Environment Tests**

สร้าง `apps/backend/src/database/environment.spec.ts`:

```ts
import { requireDatabaseUrl } from './environment';

describe('requireDatabaseUrl', () => {
  it('returns configured PostgreSQL URL', () => {
    expect(
      requireDatabaseUrl({
        DATABASE_URL: 'postgresql://user:password@localhost:5432/database',
      }),
    ).toBe('postgresql://user:password@localhost:5432/database');
  });

  it('throws a descriptive error when DATABASE_URL is missing', () => {
    expect(() => requireDatabaseUrl({})).toThrow(
      'Missing required environment variable: DATABASE_URL',
    );
  });
});
```

- [ ] **Step 2: Run Test เพื่อยืนยันว่า Fail**

Run:

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm --filter backend test environment.spec.ts --runInBand
```

Expected: FAIL ด้วย `Cannot find module './environment'`

- [ ] **Step 3: สร้าง Environment Loader**

สร้าง `apps/backend/src/database/environment.ts`:

```ts
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
```

- [ ] **Step 4: Run Unit Test เพื่อยืนยันว่า Pass**

Run:

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm --filter backend test environment.spec.ts --runInBand
```

Expected: 2 Tests PASS

- [ ] **Step 5: สร้าง PrismaService และ DatabaseModule**

สร้าง `apps/backend/src/database/prisma.service.ts`:

```ts
import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';
import { requireDatabaseUrl } from './environment';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const databaseUrl = requireDatabaseUrl();

    super({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

สร้าง `apps/backend/src/database/database.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

แก้ `apps/backend/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [DatabaseModule, HealthModule],
})
export class AppModule {}
```

เพิ่ม `prisma` และ `prisma.config.ts` ใน `exclude` ของ `apps/backend/tsconfig.build.json` เพื่อให้ Nest Build Compile เฉพาะ Application Source และเพิ่ม `src/generated/prisma/**` ใน `ignores` ของ `apps/backend/eslint.config.mjs` เพราะ Generated Client ไม่ใช่ Source ที่แก้ด้วยมือ

- [ ] **Step 6: Build และ Commit**

Run:

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm --filter backend build
pnpm --filter backend lint
```

Expected: Build และ Lint Exit 0

```bash
git add apps/backend/src/database apps/backend/src/app.module.ts apps/backend/tsconfig.build.json apps/backend/eslint.config.mjs apps/backend/prisma.config.ts
git commit -m "feat: connect NestJS to PostgreSQL with Prisma"
```

### Task 4: Seed บ้าน 164 หลังและ Database Integration Tests แบบ Test-first

**Files:**

- Create: `apps/backend/src/database/house-seed.spec.ts`
- Create: `apps/backend/src/database/house-seed.ts`
- Create: `apps/backend/prisma/seed.ts`
- Create: `apps/backend/test/database.e2e-spec.ts`

**Interfaces:**

- Consumes: `PrismaClient`, `House` Model
- Produces: `buildHouseSeed(): HouseSeedRow[]`, `seedHouses(prisma: PrismaClient): Promise<void>`, Prisma Seed Entrypoint

- [ ] **Step 1: เขียน Failing Unit Tests ของ Seed Rows**

สร้าง `apps/backend/src/database/house-seed.spec.ts`:

```ts
import { buildHouseSeed } from './house-seed';

describe('buildHouseSeed', () => {
  it('creates exactly 164 houses', () => {
    expect(buildHouseSeed()).toHaveLength(164);
  });

  it('creates ordered zero-padded codes', () => {
    const houses = buildHouseSeed();

    expect(houses[0]).toEqual({ code: 'R5-001', sequenceNumber: 1 });
    expect(houses[4]).toEqual({ code: 'R5-005', sequenceNumber: 5 });
    expect(houses[163]).toEqual({ code: 'R5-164', sequenceNumber: 164 });
    expect(new Set(houses.map(({ code }) => code)).size).toBe(164);
  });
});
```

- [ ] **Step 2: Run Test เพื่อยืนยันว่า Fail**

Run:

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm --filter backend test house-seed.spec.ts --runInBand
```

Expected: FAIL ด้วย `Cannot find module './house-seed'`

- [ ] **Step 3: สร้าง Seed Logic ขั้นต่ำ**

สร้าง `apps/backend/src/database/house-seed.ts`:

```ts
import type { PrismaClient } from '../generated/prisma/client';

export interface HouseSeedRow {
  code: string;
  sequenceNumber: number;
}

export function buildHouseSeed(): HouseSeedRow[] {
  return Array.from({ length: 164 }, (_, index) => {
    const sequenceNumber = index + 1;

    return {
      code: `R5-${sequenceNumber.toString().padStart(3, '0')}`,
      sequenceNumber,
    };
  });
}

export async function seedHouses(prisma: PrismaClient): Promise<void> {
  const operations = buildHouseSeed().map((house) =>
    prisma.house.upsert({
      where: { code: house.code },
      update: {},
      create: house,
    }),
  );

  await prisma.$transaction(operations);
}
```

- [ ] **Step 4: Run Unit Tests เพื่อยืนยันว่า Pass**

Run:

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm --filter backend test house-seed.spec.ts --runInBand
```

Expected: 2 Tests PASS

- [ ] **Step 5: สร้าง Seed Entrypoint**

สร้าง `apps/backend/prisma/seed.ts`:

```ts
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
```

- [ ] **Step 6: เขียน Database E2E Tests**

สร้าง `apps/backend/test/database.e2e-spec.ts`:

```ts
import { Test, type TestingModule } from '@nestjs/testing';

import { DatabaseModule } from '../src/database/database.module';
import { seedHouses } from '../src/database/house-seed';
import { PrismaService } from '../src/database/prisma.service';

describe('Database and house seed (e2e)', () => {
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();
    await moduleFixture.init();
    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  it('connects to PostgreSQL', async () => {
    await expect(prisma.$queryRaw`SELECT 1 AS value`).resolves.toEqual([
      { value: 1 },
    ]);
  });

  it('applies custom domain constraints', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'violation_cycles_one_open_per_house'
    `;
    const constraints = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname
      FROM pg_constraint
      WHERE conname IN (
        'houses_sequence_number_positive',
        'violation_cycles_cycle_number_positive',
        'violation_cycles_closed_at_matches_status',
        'parking_violations_sequence_matches_status',
        'fines_amount_baht_non_negative',
        'fine_payments_amount_baht_positive',
        'evidence_size_bytes_non_negative'
      )
    `;

    expect(indexes).toEqual([
      { indexname: 'violation_cycles_one_open_per_house' },
    ]);
    expect(constraints).toHaveLength(7);
  });

  it('seeds 164 unique ordered houses', async () => {
    await seedHouses(prisma);

    const houses = await prisma.house.findMany({
      orderBy: { sequenceNumber: 'asc' },
    });

    expect(houses).toHaveLength(164);
    expect(houses[0]?.code).toBe('R5-001');
    expect(houses[163]?.code).toBe('R5-164');
    expect(new Set(houses.map(({ code }) => code)).size).toBe(164);
    expect(
      new Set(houses.map(({ sequenceNumber }) => sequenceNumber)).size,
    ).toBe(164);
  });

  it('is idempotent and preserves existing house data', async () => {
    await seedHouses(prisma);
    await prisma.house.update({
      where: { code: 'R5-001' },
      data: { actualHouseNumber: 'TEST-KEEP', isActive: false },
    });

    try {
      await seedHouses(prisma);

      const [count, house] = await Promise.all([
        prisma.house.count(),
        prisma.house.findUniqueOrThrow({ where: { code: 'R5-001' } }),
      ]);

      expect(count).toBe(164);
      expect(house.actualHouseNumber).toBe('TEST-KEEP');
      expect(house.isActive).toBe(false);
    } finally {
      await prisma.house.update({
        where: { code: 'R5-001' },
        data: { actualHouseNumber: null, isActive: true },
      });
    }
  });
});
```

- [ ] **Step 7: Run Seed สองครั้งและ E2E Tests**

Run:

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm db:seed
pnpm db:seed
pnpm --filter backend test:e2e --runInBand
```

Expected: Seed ทั้งสองรอบ Exit 0; Health E2E และ Database E2E ทุก Test PASS

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/database/house-seed.ts apps/backend/src/database/house-seed.spec.ts apps/backend/prisma/seed.ts apps/backend/test/database.e2e-spec.ts
git commit -m "feat: seed 164 houses idempotently"
```

### Task 5: Documentation และ Full Verification

**Files:**

- Modify: `README.md`

**Interfaces:**

- Consumes: Database Commands และ Configuration จาก Tasks 1–4
- Produces: Setup Guide ที่รันตามได้ และผล Verification ครบ Workspace

- [ ] **Step 1: อัปเดต README**

เปลี่ยน Tech Stack ให้ระบุ:

```markdown
- Database: PostgreSQL 18.4
- ORM: Prisma ORM 7 with PostgreSQL Driver Adapter
- Local Infrastructure: Docker Compose
```

เพิ่มหัวข้อ:

````markdown
## Database Setup

สร้าง Local Environment:

```bash
cp .env.example .env
```

เริ่ม PostgreSQL, Apply Migration และ Seed บ้าน 164 หลัง:

```bash
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm db:status
```

หยุด PostgreSQL โดยเก็บข้อมูลใน Named Volume:

```bash
pnpm db:down
```

Seed รันซ้ำได้และไม่เขียนทับข้อมูลบ้านเดิม รหัสบ้านอยู่ระหว่าง `R5-001` ถึง `R5-164`
````

แก้ Current Scope ให้รวม PostgreSQL, Prisma Schema, Initial Migration, NestJS DatabaseModule และ Seed บ้าน 164 หลัง ลบรายการเหล่านี้ออกจาก Future Development Steps

- [ ] **Step 2: ตรวจ Format, Schema, Migration, Tests, Lint และ Build**

Run:

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm exec prettier --check compose.yaml pnpm-workspace.yaml package.json apps/backend/package.json apps/backend/prisma.config.ts apps/backend/prisma apps/backend/src/database apps/backend/test/database.e2e-spec.ts README.md
pnpm --filter backend prisma:validate
pnpm db:status
pnpm --filter backend test --runInBand
pnpm --filter backend test:e2e --runInBand
pnpm lint
pnpm build
git diff --check
```

Expected: ทุกคำสั่ง Exit 0; Unit/E2E Tests PASS; Schema Valid; Database Up to Date; Git Diff ไม่มี Whitespace Error

- [ ] **Step 3: ตรวจ Seed Data ด้วย SQL**

Run:

```bash
docker compose exec postgres psql -U spk_r5 -d spk_r5_parking_log -c 'SELECT COUNT(*) AS house_count, MIN(sequence_number) AS first_sequence, MAX(sequence_number) AS last_sequence, MIN(code) AS first_code, MAX(code) AS last_code FROM houses;'
```

Expected:

```text
house_count = 164
first_sequence = 1
last_sequence = 164
first_code = R5-001
last_code = R5-164
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add database setup guide"
```

- [ ] **Step 5: Final Status Check**

Run:

```bash
git status --short
git log -6 --oneline
```

Expected: Working Tree สะอาด; มี Commits จาก Tasks 1–5 ครบ
