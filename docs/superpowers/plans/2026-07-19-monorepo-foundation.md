# แผนสร้างโครงสร้างเริ่มต้น Monorepo สำหรับ SPK R5 Parking Log

> **สำหรับ agentic workers:** REQUIRED SUB-SKILL: ใช้ superpowers:subagent-driven-development (แนะนำ) หรือ superpowers:executing-plans เพื่อทำแผนทีละ Task โดยแต่ละขั้นใช้ checkbox (`- [ ]`) ติดตามสถานะ

**เป้าหมาย:** สร้าง pnpm workspace ที่มี Next.js Frontend, NestJS Backend และ Shared Types ซึ่งรันและ Build แยกกันได้

**สถาปัตยกรรม:** Root Workspace ควบคุม Packages ใน `apps/*` และ `packages/*` Frontend เป็น Static Export เท่านั้น Backend เป็นเจ้าของ HTTP API และ Health Check ส่วน Shared Types เป็นสัญญา TypeScript ร่วมที่ Compile เป็น JavaScript และ Type Declaration

**Tech Stack:** Node.js 22 LTS, pnpm, Next.js App Router, TypeScript, Tailwind CSS, ESLint, NestJS, Jest

## ข้อจำกัดส่วนกลาง

- ทำงานตรงใน Root `spk-r5-parking-log` ปัจจุบัน ห้ามสร้าง Root ซ้อน
- ชื่อ Package ต้องเป็น `frontend`, `backend` และ `@spk-r5-parking-log/shared-types`
- ใช้ TypeScript Strict Mode และหลีกเลี่ยง `any` ที่ไม่จำเป็น
- Frontend ต้องรองรับ Static Export และห้ามใช้ Server Actions, API Routes, SSR หรือ Dynamic Rendering
- ห้ามเพิ่ม Database, Prisma, Authentication, Docker, Production Secrets และ Business Logic การกระทำผิดจริง
- Generated Scaffold และ Configuration ใช้ Build กับ Lint เป็น Verification; Health Check ใช้ Test-first

---

### Task 1: สร้าง Root Workspace และ Official Scaffolds

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `apps/frontend/**` ผ่าน `create-next-app`
- Create: `apps/backend/**` ผ่าน Nest CLI

**Interfaces:**
- Consumes: ไม่มี
- Produces: pnpm workspace และ Applications ชื่อ `frontend`, `backend`

- [ ] **Step 1: สร้าง Root Workspace Configuration**

สร้าง `package.json`:

```json
{
  "name": "spk-r5-parking-log",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel --filter './apps/*' dev",
    "dev:frontend": "pnpm --filter frontend dev",
    "dev:backend": "pnpm --filter backend start:dev",
    "build": "pnpm --recursive build",
    "build:frontend": "pnpm --filter frontend build",
    "build:backend": "pnpm --filter backend build",
    "lint": "pnpm --recursive lint",
    "format": "pnpm --recursive format"
  },
  "devDependencies": {
    "prettier": "latest"
  }
}
```

สร้าง `pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - packages/*
```

- [ ] **Step 2: รัน Official Generators โดยไม่สร้าง Git Repository ซ้อน**

Run:

```bash
pnpm create next-app@latest apps/frontend --ts --tailwind --eslint --app --src-dir --use-pnpm --import-alias '@/*' --skip-install --disable-git --yes
pnpm dlx @nestjs/cli@latest new apps/backend --package-manager pnpm --skip-git --skip-install --strict
```

Expected: มี `apps/frontend/package.json` และ `apps/backend/package.json`; ไม่มี `.git` ซ้อนใต้ `apps`

- [ ] **Step 3: Normalize Package Names และ Scripts**

แก้ `apps/frontend/package.json` ให้ `name` เป็น `frontend`, เพิ่ม dependency:

```json
"@spk-r5-parking-log/shared-types": "workspace:*"
```

และเพิ่ม script:

```json
"format": "pnpm --workspace-root exec prettier --write apps/frontend"
```

แก้ `apps/backend/package.json` ให้ `name` เป็น `backend`, เพิ่ม dependency:

```json
"@spk-r5-parking-log/shared-types": "workspace:*"
```

เพิ่ม alias สำหรับ Root Development Script:

```json
"dev": "nest start --watch"
```

เปลี่ยน `lint` เป็น:

```json
"lint": "eslint \"{src,test}/**/*.ts\""
```

และเปลี่ยน `format` เป็น:

```json
"format": "pnpm --workspace-root exec prettier --write apps/backend"
```

- [ ] **Step 4: ตรวจโครงสร้าง Scaffold**

Run:

```bash
test -f apps/frontend/src/app/page.tsx
test -f apps/backend/src/main.ts
find apps -name .git -type d
```

Expected: สองคำสั่งแรก Exit 0; คำสั่งสุดท้ายไม่แสดงผล

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml apps
git commit -m "chore: scaffold frontend and backend workspaces"
```

### Task 2: สร้าง Shared Types Package

**Files:**
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-types/tsconfig.json`
- Create: `packages/shared-types/src/index.ts`

**Interfaces:**
- Consumes: Root pnpm workspace
- Produces: `ViolationStatus`, `HealthCheckResponse`

- [ ] **Step 1: สร้าง Package Manifest**

```json
{
  "name": "@spk-r5-parking-log/shared-types",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "tsc --noEmit",
    "format": "pnpm --workspace-root exec prettier --write packages/shared-types"
  },
  "devDependencies": {
    "typescript": "latest"
  }
}
```

- [ ] **Step 2: สร้าง Strict TypeScript Configuration**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: สร้าง Public Types**

```ts
export type ViolationStatus =
  | 'WARNING'
  | 'PENDING_FINE'
  | 'PAID'
  | 'CANCELLED';

export interface HealthCheckResponse {
  status: 'ok';
  service: string;
}
```

- [ ] **Step 4: ติดตั้งและ Build Package**

Run:

```bash
pnpm install
pnpm --filter @spk-r5-parking-log/shared-types build
test -f packages/shared-types/dist/index.js
test -f packages/shared-types/dist/index.d.ts
```

Expected: Exit 0 ทุกคำสั่ง

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml packages apps/frontend/package.json apps/backend/package.json
git commit -m "feat: add shared types package"
```

### Task 3: สร้าง Backend Health Check แบบ Test-first

**Files:**
- Delete: `apps/backend/src/app.controller.ts`
- Delete: `apps/backend/src/app.controller.spec.ts`
- Delete: `apps/backend/src/app.service.ts`
- Create: `apps/backend/src/health/health.controller.spec.ts`
- Create: `apps/backend/src/health/health.controller.ts`
- Create: `apps/backend/src/health/health.module.ts`
- Modify: `apps/backend/src/app.module.ts`
- Modify: `apps/backend/src/main.ts`
- Modify: `apps/backend/test/app.e2e-spec.ts`

**Interfaces:**
- Consumes: `HealthCheckResponse` จาก Shared Types
- Produces: `GET /api/health` ตอบ `{ status: 'ok', service: 'spk-r5-parking-log-api' }`

- [ ] **Step 1: เขียน Failing Unit Test**

สร้าง `apps/backend/src/health/health.controller.spec.ts`:

```ts
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns service health status', () => {
    const controller = new HealthController();

    expect(controller.check()).toEqual({
      status: 'ok',
      service: 'spk-r5-parking-log-api',
    });
  });
});
```

- [ ] **Step 2: Run Test เพื่อยืนยัน RED**

Run:

```bash
pnpm --filter backend test -- health.controller.spec.ts --runInBand
```

Expected: FAIL เพราะหา `./health.controller` ไม่พบ

- [ ] **Step 3: สร้าง Health Controller ขั้นต่ำ**

```ts
import type { HealthCheckResponse } from '@spk-r5-parking-log/shared-types';
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthCheckResponse {
    return {
      status: 'ok',
      service: 'spk-r5-parking-log-api',
    };
  }
}
```

- [ ] **Step 4: Run Test เพื่อยืนยัน GREEN**

Run:

```bash
pnpm --filter backend test -- health.controller.spec.ts --runInBand
```

Expected: PASS 1 test

- [ ] **Step 5: สร้าง Health Module และเชื่อม App Module**

สร้าง `apps/backend/src/health/health.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

แทนเนื้อหา `apps/backend/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { HealthModule } from './health/health.module';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
```

ลบ Default Controller, Test และ Service

- [ ] **Step 6: ตั้งค่า Backend Bootstrap**

แทนเนื้อหา `apps/backend/src/main.ts`:

```ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.BACKEND_PORT) || 3001;
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: [frontendUrl],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port);
}

void bootstrap();
```

- [ ] **Step 7: Verify Backend**

แทน Default E2E Test ใน `apps/backend/test/app.e2e-spec.ts`:

```ts
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Health endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({
        status: 'ok',
        service: 'spk-r5-parking-log-api',
      });
  });
});
```

Run:

```bash
pnpm --filter backend test --runInBand
pnpm --filter backend test:e2e --runInBand
pnpm --filter backend build
pnpm --filter backend lint
```

Expected: Unit Test, E2E Test, Build และ Lint Exit 0

- [ ] **Step 8: Commit**

```bash
git add apps/backend
git commit -m "feat: add backend health endpoint"
```

### Task 4: ตั้งค่า Static Frontend และหน้า System Check

**Files:**
- Modify: `apps/frontend/next.config.ts`
- Modify: `apps/frontend/src/app/layout.tsx`
- Modify: `apps/frontend/src/app/page.tsx`
- Modify: `apps/frontend/src/app/globals.css`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_API_URL` และ `HealthCheckResponse` แบบ Type-only
- Produces: Static responsive page พร้อมข้อความที่กำหนด

- [ ] **Step 1: ตั้งค่า Static Export**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

- [ ] **Step 2: ตั้งค่า Root Layout โดยไม่ Fetch Font**

```tsx
import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'SPK R5 Parking Log',
  description: 'Parking Violation Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: สร้างหน้า System Check**

```tsx
import type { HealthCheckResponse } from '@spk-r5-parking-log/shared-types';

const serviceStatus: HealthCheckResponse['status'] = 'ok';
const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function Home() {
  return (
    <main className="parking-shell" data-api-url={apiUrl}>
      <section className="status-card" aria-labelledby="page-title">
        <div className="parking-mark" aria-hidden="true">
          P
        </div>
        <div className="status-copy">
          <p className="system-label">Parking Violation Management System</p>
          <h1 id="page-title">SPK R5 Parking Log</h1>
          <p className="running-status" data-status={serviceStatus}>
            <span aria-hidden="true" />
            Frontend is running
          </p>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: สร้าง Responsive Visual Style**

แทน `globals.css` ด้วย:

```css
@import "tailwindcss";

:root {
  --asphalt: #101923;
  --asphalt-light: #1c2a38;
  --safety: #f6bd3b;
  --road-white: #f4f7f8;
  --muted: #9caab7;
}

* {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  background: var(--asphalt);
  color: var(--road-white);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
}

.parking-shell {
  position: relative;
  display: grid;
  min-height: 100vh;
  place-items: center;
  overflow: hidden;
  padding: 2rem;
  background:
    linear-gradient(120deg, transparent 0 68%, rgb(246 189 59 / 8%) 68% 69%, transparent 69%),
    repeating-linear-gradient(90deg, transparent 0 8rem, rgb(244 247 248 / 5%) 8rem 8.125rem),
    var(--asphalt);
}

.status-card {
  position: relative;
  display: grid;
  width: min(100%, 58rem);
  grid-template-columns: 10rem 1fr;
  gap: 2.5rem;
  align-items: center;
  padding: clamp(2rem, 5vw, 4.5rem);
  border: 1px solid rgb(246 189 59 / 65%);
  background: rgb(28 42 56 / 92%);
  box-shadow: 0 2rem 6rem rgb(0 0 0 / 35%);
}

.status-card::after {
  position: absolute;
  right: 1.5rem;
  bottom: -3.25rem;
  width: 8rem;
  height: 6rem;
  border: 0.5rem solid var(--road-white);
  border-top: 0;
  content: "";
  opacity: 0.12;
  transform: skewX(-10deg);
}

.parking-mark {
  display: grid;
  aspect-ratio: 1;
  place-items: center;
  border: 0.375rem solid var(--safety);
  color: var(--safety);
  font-family: "Arial Narrow", Arial, sans-serif;
  font-size: clamp(4rem, 8vw, 6.5rem);
  font-weight: 800;
  line-height: 1;
}

.system-label {
  margin: 0 0 1rem;
  color: var(--safety);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1 {
  max-width: 12ch;
  margin: 0;
  font-family: "Arial Narrow", Arial, sans-serif;
  font-size: clamp(3rem, 7vw, 6.25rem);
  font-stretch: condensed;
  font-weight: 800;
  letter-spacing: -0.055em;
  line-height: 0.9;
}

.running-status {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin: 2rem 0 0;
  color: var(--muted);
  font-size: 0.95rem;
}

.running-status span {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  background: #57d38c;
  box-shadow: 0 0 0 0.25rem rgb(87 211 140 / 12%);
}

@media (max-width: 640px) {
  .parking-shell {
    padding: 1rem;
  }

  .status-card {
    grid-template-columns: 1fr;
    gap: 1.75rem;
  }

  .parking-mark {
    width: 5rem;
    border-width: 0.25rem;
    font-size: 3.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Verify Static Build และ Lint**

Run:

```bash
pnpm --filter frontend build
pnpm --filter frontend lint
test -f apps/frontend/out/index.html
rg -n "SPK R5 Parking Log|Parking Violation Management System|Frontend is running" apps/frontend/out/index.html
```

Expected: Build และ Lint Exit 0; `out/index.html` มีข้อความครบ

- [ ] **Step 6: Commit**

```bash
git add apps/frontend
git commit -m "feat: add static frontend status page"
```

### Task 5: สร้าง Environment, Business Rules และ Project Documentation

**Files:**
- Create: `.env.example`
- Create: `.gitignore`
- Create: `docs/business-rules.md`
- Create: `README.md`

**Interfaces:**
- Consumes: Workspace commands และ Service URLs จาก Tasks ก่อนหน้า
- Produces: Setup documentation และ Domain Rules สำหรับขั้นต่อไป

- [ ] **Step 1: สร้าง Environment Example**

```env
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Backend
BACKEND_PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

- [ ] **Step 2: สร้าง Git Ignore**

```gitignore
node_modules
.next
out
dist
.env
.env.local
.env.development.local
.env.production.local
coverage
.DS_Store
*.log
pnpm-debug.log
```

- [ ] **Step 3: สร้าง Business Rules**

สร้าง `docs/business-rules.md`:

````markdown
# กฎทางธุรกิจ SPK R5 Parking Log

## ข้อมูลทั่วไป

- ชื่อระบบคือ SPK R5 Parking Log
- ระบบรองรับบ้านทั้งหมด 164 หลัง
- ใช้สำหรับบันทึกและติดตามบ้านที่จอดรถผิดระเบียบ
- บ้านแต่ละหลังต้องมีประวัติการกระทำผิดแยกจากกัน

## กติกาการกระทำผิด

- การกระทำผิดครั้งที่ 1 เป็นการแจ้งเตือน
- การกระทำผิดครั้งที่ 2 เป็นการแจ้งเตือน
- การกระทำผิดครั้งที่ 3 มีค่าปรับ 1,000 บาท
- การกระทำผิดหลังครั้งที่ 3 มีค่าปรับเพิ่ม 500 บาทต่อครั้ง
- เมื่อชำระค่าปรับแล้ว ให้ปิดรอบเดิมและเริ่มนับรอบใหม่

## การแสดงสถานะ

- เลข `1` ไม่มีสีพื้นหลัง หมายถึงแจ้งเตือน
- เลข `1` พื้นหลังสีแดง หมายถึงรอชำระค่าปรับ
- เลข `1` พื้นหลังสีเขียว หมายถึงชำระค่าปรับแล้ว
- สีเป็นเพียงการแสดงผลใน UI
- Database ต้องเก็บสถานะจริง เช่น `WARNING`, `PENDING_FINE` และ `PAID`

## ข้อกำหนดของระบบ

- Backend เป็นผู้คำนวณลำดับครั้งที่กระทำผิด
- Frontend ห้ามส่งหรือกำหนดลำดับครั้งที่กระทำผิดเอง
- Backend เป็นผู้คำนวณค่าปรับ
- การแก้ไขและลบข้อมูลในอนาคตต้องมี Audit Log
- การกระทำผิดต้องรองรับการแนบรูปหลักฐาน
- รูปหลักฐานจะไม่เก็บเป็น Binary ใน PostgreSQL
- ไฟล์รูปจะเก็บใน Object Storage เช่น MinIO และเก็บเฉพาะ Object Key ใน Database
````

- [ ] **Step 4: สร้าง README**

สร้าง `README.md` โดยใส่หัวข้อและข้อมูลครบดังนี้:

````markdown
# SPK R5 Parking Log

## Project Overview

Monorepo สำหรับระบบบันทึกและติดตามการจอดรถผิดระเบียบในชุมชน SPK R5 แยก Frontend, Backend และ Shared Types ชัดเจน

## Business Purpose

ระบบรองรับบ้าน 164 หลัง เก็บประวัติการกระทำผิดรายบ้าน และเตรียมต่อยอดการแจ้งเตือน ค่าปรับ หลักฐาน และ Audit Log

## Tech Stack

- Frontend: Next.js, App Router, TypeScript, Tailwind CSS
- Backend: NestJS, TypeScript
- Workspace: pnpm workspace
- Future: PostgreSQL, Prisma, Docker Compose

## Prerequisites

- Node.js 22 LTS
- pnpm
- Git

## Project Structure

```text
spk-r5-parking-log/
├── apps/
│   ├── frontend/
│   └── backend/
├── packages/
│   └── shared-types/
├── docs/
│   └── business-rules.md
├── .env.example
├── package.json
└── pnpm-workspace.yaml
```

## Installation

```bash
pnpm install
```

## Environment Setup

คัดลอก `.env.example` เป็น `.env.local` สำหรับ Frontend และ `.env` สำหรับ Backend ตามสภาพแวดล้อมที่ใช้

## Development Commands

```bash
pnpm dev
pnpm dev:frontend
pnpm dev:backend
```

## Build Commands

```bash
pnpm build
pnpm build:frontend
pnpm build:backend
```

## Lint Commands

```bash
pnpm lint
```

## Service URLs

- Frontend: http://localhost:3000
- Backend Health Check: http://localhost:3001/api/health

## Current Scope

- Static Next.js status page
- NestJS health endpoint
- Shared TypeScript types
- Business rules documentation

ยังไม่มี Database, Prisma, Authentication, Docker และ Business Logic การกระทำผิดจริง

## Future Development Steps

1. PostgreSQL
2. Prisma
3. Database Schema
4. Seed ข้อมูลบ้าน 164 หลัง
````

- [ ] **Step 5: Verify Documentation Constraints**

Run:

```bash
git check-ignore .env.example && exit 1 || true
rg -n "DATABASE_URL|JWT|MINIO|Production Domain" .env.example && exit 1 || true
rg -n "164|1,000|500|WARNING|PENDING_FINE|PAID|Object Key" docs/business-rules.md
```

Expected: `.env.example` ไม่ถูก Ignore; ไม่มี Environment Variables ที่ห้าม; Business Rules มีคำสำคัญครบ

- [ ] **Step 6: Commit**

```bash
git add .env.example .gitignore README.md docs/business-rules.md
git commit -m "docs: add project setup and business rules"
```

### Task 6: ตรวจทั้งระบบและ Runtime URLs

**Files:**
- Modify: เฉพาะไฟล์ที่พบปัญหาระหว่าง Verification

**Interfaces:**
- Consumes: ทุก Package และ Root Scripts
- Produces: หลักฐาน Build, Lint, Runtime และ HTTP Health Check

- [ ] **Step 1: Fresh Install และ Static Checks**

Run:

```bash
pnpm install
pnpm build
pnpm lint
```

Expected: ทุกคำสั่ง Exit 0; Frontend, Backend และ Shared Types Build สำเร็จ

- [ ] **Step 2: เริ่ม Development Servers จาก Root**

Run ใน Background Session:

```bash
pnpm dev
```

Expected: Next.js พร้อมที่ Port 3000; NestJS พร้อมที่ Port 3001

- [ ] **Step 3: ตรวจ HTTP URLs**

Run:

```bash
curl --fail --silent http://localhost:3000 | rg "SPK R5 Parking Log"
curl --fail --silent http://localhost:3001/api/health
```

Expected Health JSON:

```json
{"status":"ok","service":"spk-r5-parking-log-api"}
```

- [ ] **Step 4: หยุด Development Servers และตรวจ Git Diff**

หยุด `pnpm dev` ด้วย `Ctrl-C` แล้ว Run:

```bash
git diff --check
git status --short
```

Expected: ไม่มี Whitespace Error; แสดงเฉพาะ Changes ที่ตั้งใจไว้

- [ ] **Step 5: Final Commit หากมี Verification Fixes**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml apps packages docs README.md .env.example .gitignore
git commit -m "fix: complete monorepo verification"
```
