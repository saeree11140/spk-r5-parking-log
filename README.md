# SPK R5 Parking Log

## Project Overview

Monorepo สำหรับระบบบันทึกและติดตามการจอดรถผิดระเบียบในชุมชน SPK R5 แยก Frontend, Backend และ Shared Types ชัดเจน แต่ละ Application รันและ Build แยกกันได้

## Business Purpose

ระบบรองรับบ้าน 164 หลัง เก็บประวัติการกระทำผิดรายบ้าน และเตรียมต่อยอดการแจ้งเตือน ค่าปรับ รูปหลักฐาน และ Audit Log

## Tech Stack

- Frontend: Next.js, App Router, TypeScript, Tailwind CSS
- Backend: NestJS, TypeScript
- Database: PostgreSQL 18.4
- ORM: Prisma ORM 7 with PostgreSQL Driver Adapter
- Local Infrastructure: Docker Compose
- Package Manager: pnpm
- Monorepo: pnpm workspace

## Prerequisites

- Node.js 22 LTS
- pnpm
- Git
- Docker Desktop หรือ OrbStack

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

ใช้ `.env.example` เป็นรายการตัวแปรอ้างอิง

Frontend โหลด `NEXT_PUBLIC_API_URL` จาก `apps/frontend/.env.local` ได้อัตโนมัติ:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Backend อ่านตัวแปรจาก Process Environment หากไม่กำหนดจะใช้ Port 3001 และ Frontend URL สำหรับ Local Development:

```bash
BACKEND_PORT=3001 FRONTEND_URL=http://localhost:3000 pnpm dev:backend
```

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

## Development Commands

รันทั้งระบบ:

```bash
pnpm dev
```

รันแยกแต่ละ Application:

```bash
pnpm dev:frontend
pnpm dev:backend
```

## Build Commands

Build ทั้งระบบ:

```bash
pnpm build
```

Build แยก Application:

```bash
pnpm build:frontend
pnpm build:backend
```

Build Shared Types:

```bash
pnpm --filter @spk-r5-parking-log/shared-types build
```

## Lint Commands

```bash
pnpm lint
```

## Service URLs

- Frontend: http://localhost:3000
- Backend Health Check: http://localhost:3001/api/health

## Core Parking API

Routes:

```text
GET  /api/houses
GET  /api/houses/:houseCode
POST /api/houses/:houseCode/violations
POST /api/houses/:houseCode/violations/:violationId/cancel
POST /api/houses/:houseCode/violations/:violationId/mark-paid
```

Backend คำนวณลำดับและค่าปรับเอง: ครั้ง 1–2 ไม่คิดค่าปรับ, ครั้ง 3 คิด 1,000 บาท, ครั้ง 4 ขึ้นไปคิดเพิ่มรายการละ 500 บาท ตัวอย่างครั้ง 1–5 รวม 2,000 บาท

สร้าง Violation:

```bash
curl -X POST http://localhost:3001/api/houses/R5-001/violations \
  -H 'Content-Type: application/json' \
  -d '{"occurredAt":"2026-07-19T10:30:00+07:00","note":"จอดขวางทางเข้า"}'
```

ยกเลิก Violation ก่อนมี Fine ชำระแล้ว:

```bash
curl -X POST http://localhost:3001/api/houses/R5-001/violations/VIOLATION_UUID/cancel \
  -H 'Content-Type: application/json' \
  -d '{"reason":"บันทึกผิดหลัง"}'
```

บันทึก Fine ว่าชำระแล้ว:

```bash
curl -X POST http://localhost:3001/api/houses/R5-001/violations/VIOLATION_UUID/mark-paid \
  -H 'Content-Type: application/json' \
  -d '{"paidAt":"2026-07-19T15:00:00+07:00","reference":"ใบเสร็จ-001"}'
```

Mark-paid เก็บสถานะการชำระ Offline เท่านั้น ระบบไม่รับเงินจริง ไม่เชื่อม Payment Gateway และไม่เก็บข้อมูลบัตร Cycle ปิดเมื่อ Fine ที่ไม่ถูกยกเลิกทุกใบเป็น `PAID`

## Current Scope

- Static Next.js status page
- NestJS health endpoint
- House Summary และ House Detail API
- Create/Cancel Violation พร้อม Backend Resequence
- Fine แยกราย Violation และ Offline Paid Status
- Serializable Transaction, Concurrency Retry และ Audit Log
- Shared TypeScript types และ Type Declaration Output
- Business Rules Documentation
- PostgreSQL 18.4 บน Docker Compose
- Prisma Schema และ Initial Migration
- NestJS DatabaseModule และ PrismaService
- Seed บ้าน 164 หลังแบบ Idempotent

ยังไม่มี Authentication, Authorization, Evidence Upload, Object Storage, Frontend Integration และ Online Payment

## Future Development Steps

1. Authentication และ Authorization
2. Frontend Integration
3. Evidence Upload และ Object Storage
