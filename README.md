# SPK R5 Parking Log

## Project Overview

Monorepo สำหรับระบบบันทึกและติดตามการจอดรถผิดระเบียบในชุมชน SPK R5 แยก Frontend, Backend และ Shared Types ชัดเจน แต่ละ Application รันและ Build แยกกันได้

## Business Purpose

ระบบรองรับบ้าน 164 หลัง เก็บประวัติการกระทำผิดรายบ้าน และเตรียมต่อยอดการแจ้งเตือน ค่าปรับ รูปหลักฐาน และ Audit Log

## Tech Stack

- Frontend: Vite, TanStack Router, TypeScript, Tailwind CSS
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
- Desktop Browser ที่รองรับ Web Locks API (ใช้ประสาน Refresh Token ข้ามแท็บ)

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

Frontend เรียก API ที่ `/api` บน origin เดียวกันเสมอ ตอน dev Vite proxy `/api`
ไปที่ `http://localhost:3001` จึงไม่ต้องตั้งค่าอะไร ถ้า API อยู่ที่ path อื่นให้ตั้ง
`VITE_API_URL` ใน `apps/frontend/.env.local` ก่อน build:

```env
VITE_API_URL=/api
```

Backend อ่านตัวแปรจาก Process Environment หากไม่กำหนดจะใช้ Port 3001 และ Frontend URL สำหรับ Local Development:

```bash
BACKEND_PORT=3001 FRONTEND_URL=http://localhost:3000 pnpm dev:backend
```

ก่อน Seed ครั้งแรก ต้องแทน placeholder ใน `.env`:

```env
JWT_ACCESS_SECRET=<random-secret-อย่างน้อย-32-bytes>
AUTH_TOKEN_PEPPER=<random-secret-อีกชุด-อย่างน้อย-32-bytes>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<รหัสผ่านชั่วคราว-ตาม-policy>
ADMIN_DISPLAY_NAME=ผู้ดูแลระบบ
```

Password ต้องยาว 12–128 ตัวอักษร มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข ห้าม commit ค่าจริงลง Git

`TRUST_PROXY_HOPS` ต้องเป็นจำนวน reverse proxy ที่รู้แน่นอนระหว่าง `0–3`
เท่านั้น ใช้ `0` เมื่อ Backend รับ request โดยตรง และ `1` เมื่ออยู่หลัง proxy
หนึ่งชั้น ห้ามเชื่อถือ `X-Forwarded-For` แบบไม่จำกัด
ตอน `NODE_ENV=production` ต้องตั้งค่านี้เอง ไม่งั้น Backend ไม่ยอม start
เพราะ login lockout ล็อกแยกตาม IP ถ้าตั้ง `0` ทั้งที่อยู่หลัง proxy ทุกคนจะได้ IP
ของ proxy และ lockout จะล็อกทั้งบัญชี ถ้าตั้งสูงเกินจริง ผู้โจมตีปลอม
`X-Forwarded-For` เพื่อหมุน IP ได้

## Database Setup

สร้าง Local Environment:

```bash
cp .env.example .env
```

เริ่ม PostgreSQL, Apply Migration และ Seed บ้าน 164 หลังพร้อม ADMIN คนแรก:

```bash
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm db:status
```

Seed รันซ้ำได้ ไม่เขียนทับบ้านหรือ ADMIN เดิม Login ครั้งแรกบังคับเปลี่ยนรหัสผ่าน

ลบ Auth Session ที่หมดอายุ และ login failure เก่าที่ไม่ได้ล็อกอยู่:

```bash
pnpm --filter backend auth:sessions:cleanup
```

Login ผิด 5 ครั้งจาก IP เดียวล็อก user นั้นที่ IP นั้น 15 นาที และผิดรวม 20 ครั้ง
จากทุก IP ภายใน 1 ชั่วโมงล็อกทั้งบัญชี 15 นาที ADMIN ปลดล็อกคนอื่นได้ด้วยการ
reset password ถ้า ADMIN คนเดียวถูกล็อก ให้ผู้ที่เข้าถึง Database ได้รัน:

```bash
pnpm --filter backend auth:unlock <username>
```

คำสั่งนี้ล้าง lock ทุกแบบของ user นั้นและบันทึก audit `UNLOCK` ดูเหตุผลของการออกแบบใน
`docs/adr/0001-login-lockout.md`

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

## Deploy Frontend บน VPS

Frontend เป็น static file ล้วน วางบน VPS ที่มี nginx ได้เลย VPS เครื่องเดียวรับได้หลาย
โปรเจกต์ แต่ละโดเมนเป็น nginx virtual host ของตัวเอง ชี้ `root` ไปที่ `dist/`
ของโปรเจกต์นั้น และส่ง `/api` ไปที่ backend port ของโปรเจกต์นั้น ตัวอย่างอยู่ที่
`deploy/nginx/spk-r5-parking-log.conf.example`

Frontend กับ API ต้องอยู่โดเมนเดียวกัน เพราะ frontend อ่าน CSRF cookie จาก
`document.cookie` ห้ามแยก API ไปไว้ใน subdomain อื่น

1. Build บนเครื่องที่มี source:

   ```bash
   pnpm --filter frontend build
   ```

2. Copy `apps/frontend/dist/` ไปที่ VPS เช่น `/var/www/parking.example.com/dist`
3. ขอ certificate ก่อนเปิด site (ต้องมี nginx ที่รับ port 80 อยู่แล้ว):

   ```bash
   sudo certbot certonly --nginx -d parking.example.com
   ```

4. Copy ไฟล์ตัวอย่างไปที่ `/etc/nginx/sites-available/parking.example.com.conf`
   แก้ทุกค่าที่มี `CHANGE ME` (โดเมน, path ของ certificate, `root`, backend port)
   แล้วเปิดใช้:

   ```bash
   sudo ln -s ../sites-available/parking.example.com.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

5. Backend ของโดเมนนี้ต้องตั้ง `FRONTEND_URL=https://parking.example.com` (ตรงทุกตัวอักษร),
   `TRUST_PROXY_HOPS=1`, `COOKIE_SECURE=true` และ `BACKEND_PORT` ไม่ซ้ำกับโปรเจกต์อื่นบนเครื่อง

Deploy รอบถัดไปทำแค่ข้อ 1–2 nginx ส่ง `index.html` แบบ `no-cache` ส่วนไฟล์ใน
`/assets/` มี hash ในชื่อและ cache 1 ปี ผู้ใช้จึงได้เวอร์ชันใหม่ทันที

ไฟล์ตัวอย่างใส่ HSTS, `X-Content-Type-Options`, `Referrer-Policy` และ CSP ไว้แล้ว
ถ้าเพิ่ม `add_header` ใน `location` ใด header ระดับ `server` จะไม่ถูกส่งใน location นั้น
ให้ตั้ง cache ด้วย `expires` แทน

การรัน backend และ PostgreSQL บน VPS ยังไม่อยู่ในเอกสารนี้

## Lint Commands

```bash
pnpm lint
```

## Test Commands

```bash
pnpm test
pnpm --filter backend test:e2e --runInBand
```

E2E จะใช้ `E2E_DATABASE_URL` เมื่อกำหนดไว้ มิฉะนั้นจะสร้างชื่อจาก
`DATABASE_URL` โดยเติม `_test` ให้อัตโนมัติ เช่น
`spk_r5_parking_log_test` แล้ว migrate และ seed ก่อนทดสอบ ตัว test runner
จะหยุดทันทีถ้าชื่อฐานข้อมูลไม่ได้ลงท้ายด้วย `_test`

## Service URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Backend Health Check: http://localhost:3001/api/health

## Authentication และสิทธิ์

ระบบใช้ Access Token อายุ 15 นาที และ Database-backed Refresh Session อายุสูงสุด 8 ชั่วโมงผ่าน HttpOnly cookies Frontend ไม่เก็บ token ใน Local Storage ผู้ใช้ใหม่และบัญชีที่ถูก Reset Password ต้องเปลี่ยนรหัสผ่านก่อนใช้งานส่วนอื่น

| ความสามารถ                                       | ADMIN | STAFF |
| ------------------------------------------------ | :---: | :---: |
| ดูบ้านและประวัติ                                 |   ✓   |   ✓   |
| เพิ่ม/แก้ไข/ยกเลิก Violation และ Mark Fine ว่าชำระแล้ว |   ✓   |   ✓   |
| ดู/สร้าง/แก้ไข/ปิดบัญชี/Reset Password ผู้ใช้    |   ✓   |   —   |

ระบบห้าม ADMIN ปิดบัญชีหรือ Reset Password ตัวเอง และห้ามปิดหรือลดสิทธิ์
ADMIN คนสุดท้าย การเปลี่ยนรหัสผ่านตัวเองต้องใช้หน้า Change Password

## Core Parking API

Routes:

```text
GET  /api/houses
GET  /api/houses/:houseCode
POST /api/houses/:houseCode/violations
PATCH /api/houses/:houseCode/violations/:violationId
POST /api/houses/:houseCode/violations/:violationId/cancel
POST /api/houses/:houseCode/violations/:violationId/mark-paid
```

Backend คำนวณลำดับและค่าปรับเอง: ครั้ง 1–2 ไม่คิดค่าปรับ, ครั้ง 3 คิด 1,000 บาท, ครั้ง 4 ขึ้นไปคิดเพิ่มรายการละ 500 บาท ตัวอย่างครั้ง 1–5 รวม 2,000 บาท

สร้าง Violation:

```bash
curl -X POST http://localhost:3001/api/houses/R5-001/violations \
  -b cookies.txt \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:3000' \
  -H 'X-CSRF-Token: CSRF_COOKIE_VALUE' \
  -d '{"occurredAt":"2026-07-19T10:30:00+07:00","note":"จอดขวางทางเข้า"}'
```

แก้ไข Violation:

```bash
curl -X PATCH http://localhost:3001/api/houses/R5-001/violations/VIOLATION_UUID \
  -b cookies.txt \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:3000' \
  -H 'X-CSRF-Token: CSRF_COOKIE_VALUE' \
  -d '{"occurredAt":"2026-07-19T10:30:00+07:00","note":"แก้ไขรายละเอียด"}'
```

`PATCH` แก้ไขได้เฉพาะวันเวลาเกิดเหตุ (`occurredAt`) และหมายเหตุ (`note`) โดย
วันเวลาต้องไม่อยู่ในอนาคต และหมายเหตุยาวได้ไม่เกิน 1,000 ตัวอักษร ส่ง `null`
หรือข้อความว่างเพื่อล้างหมายเหตุได้ การแก้ไขทำได้เมื่อ Violation ยังไม่ถูกยกเลิก
และอยู่ใน Cycle ที่เปิดอยู่ซึ่งยังไม่มี Fine สถานะ `PAID` เท่านั้น

หลังแก้ไข Backend จะเรียง Violation ใหม่ตามวันเวลาเกิดเหตุ แล้วคำนวณลำดับ สถานะ
และ Fine ของทั้ง Cycle ใหม่อัตโนมัติ ดังนั้นการเลื่อนวันเวลาอาจทำให้ลำดับหรือค่าปรับ
ของรายการอื่นใน Cycle เปลี่ยนไปได้

ยกเลิก Violation ก่อนมี Fine ชำระแล้ว:

```bash
curl -X POST http://localhost:3001/api/houses/R5-001/violations/VIOLATION_UUID/cancel \
  -b cookies.txt \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:3000' \
  -H 'X-CSRF-Token: CSRF_COOKIE_VALUE' \
  -d '{"reason":"บันทึกผิดหลัง"}'
```

บันทึก Fine ว่าชำระแล้ว:

```bash
curl -X POST http://localhost:3001/api/houses/R5-001/violations/VIOLATION_UUID/mark-paid \
  -b cookies.txt \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:3000' \
  -H 'X-CSRF-Token: CSRF_COOKIE_VALUE' \
  -d '{"paidAt":"2026-07-19T15:00:00+07:00","reference":"ใบเสร็จ-001"}'
```

Mark-paid เก็บสถานะการชำระ Offline เท่านั้น ระบบไม่รับเงินจริง ไม่เชื่อม Payment Gateway และไม่เก็บข้อมูลบัตร Cycle ปิดเมื่อ Fine ที่ไม่ถูกยกเลิกทุกใบเป็น `PAID`

## Current Scope

- Desktop-first Admin Dashboard สำหรับบ้าน 164 หลัง พร้อม Search และ Filter
- House Detail, Cycle History และ Violation/Fine Workflows
- React Hook Form + Zod, TanStack Query + Axios, Zustand และ date-fns
- Lucide React Icons และ Vitest/Testing Library
- Static HTML Routes สำหรับ Dashboard และบ้าน `R5-001` ถึง `R5-164`
- Login, Forced Password Change, ADMIN/STAFF RBAC และ User Management
- Access/Refresh Cookie Rotation, CSRF/Origin Validation และ Login Rate Limit
- Metadata `noindex, nofollow, nocache` สำหรับ Admin UI
- NestJS health endpoint
- House Summary และ House Detail API
- Create/Edit/Cancel Violation พร้อม Backend Resequence และ Recalculate Fine
- Fine แยกราย Violation และ Offline Paid Status
- Serializable Transaction, Concurrency Retry และ Audit Log
- Shared TypeScript types และ Type Declaration Output
- Business Rules Documentation
- PostgreSQL 18.4 บน Docker Compose
- Prisma Schema และ Initial Migration
- NestJS DatabaseModule และ PrismaService
- Seed บ้าน 164 หลังแบบ Idempotent

`noindex` เป็นเพียงคำแนะนำต่อ crawler ไม่ใช่ access control ข้อมูลจริงป้องกันด้วย Backend Authentication/Authorization

ยังไม่มี Evidence Upload, Object Storage และ Online Payment

## Future Development Steps

1. Evidence Upload และ Object Storage
2. Production Deployment และ Monitoring
