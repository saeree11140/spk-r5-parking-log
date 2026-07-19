# เอกสารออกแบบ PostgreSQL, Prisma Schema และ Seed บ้าน 164 หลัง

> **หมายเหตุ:** เอกสารนี้บันทึก Design ของระยะ Database Foundation ที่นำไปใช้แล้ว ส่วน Fine และ Payment Model ถูกแก้ไขภายหลังโดย [Core Parking API Design](./2026-07-19-core-parking-api-design.md) ซึ่งเป็นข้อกำหนดล่าสุดสำหรับ Migration ถัดไป

## เป้าหมาย

เพิ่มชั้นข้อมูลให้ SPK R5 Parking Log ด้วย PostgreSQL และ Prisma ORM รองรับประวัติการจอดรถผิดระเบียบแยกตามบ้าน รอบการกระทำผิด ค่าปรับ การชำระเงิน หลักฐาน และ Audit Log พร้อม Seed บ้าน `R5-001` ถึง `R5-164`

ระยะนี้ครอบคลุม PostgreSQL บน Docker Compose, Prisma Schema, Initial Migration, Seed, การเชื่อมต่อจาก NestJS และการทดสอบชั้นข้อมูล ยังไม่สร้าง CRUD API หรือ Business Service สำหรับคำนวณลำดับและค่าปรับ

## ข้อตัดสินใจหลัก

- ใช้ `ViolationCycle` แบบชัดเจนเพื่อแบ่งรอบของบ้านแต่ละหลัง
- บ้านใช้รหัส `R5-001` ถึง `R5-164`
- ชำระค่าปรับเต็มจำนวนครั้งเดียวต่อรอบ
- รายการที่ยกเลิกไม่นับ และ Backend คำนวณลำดับใหม่
- Docker Compose มี PostgreSQL เท่านั้น
- ไฟล์หลักฐานอยู่ใน Object Storage; PostgreSQL เก็บ Metadata และ Object Key
- ข้อมูลธุรกิจหลักไม่ใช้ Hard Delete

## แบบจำลองข้อมูล

### `House`

- `id`: UUID Primary Key
- `code`: รหัสบ้าน เช่น `R5-001`; ต้องไม่ซ้ำ
- `sequenceNumber`: เลขลำดับ 1–164; ต้องไม่ซ้ำ
- `actualHouseNumber`: เลขที่บ้านจริงแบบ Nullable
- `isActive`: ค่าเริ่มต้น `true`
- `createdAt`, `updatedAt`: เวลาสร้างและแก้ไข

### `ViolationCycle`

แทนรอบการนับของบ้านหนึ่งหลัง การชำระสำเร็จปิดรอบปัจจุบัน รายการกระทำผิดครั้งถัดไปจึงสร้างรอบใหม่

- `id`: UUID Primary Key
- `houseId`: Foreign Key ไป `House`
- `cycleNumber`: ลำดับรอบของบ้าน เริ่มจาก 1
- `status`: `OPEN` หรือ `CLOSED`
- `openedAt`: เวลาเปิดรอบ
- `closedAt`: เวลาปิดรอบแบบ Nullable
- `createdAt`, `updatedAt`: เวลาสร้างและแก้ไข
- Unique Constraint ที่ `(houseId, cycleNumber)`
- PostgreSQL Partial Unique Index ให้แต่ละบ้านมีรอบ `OPEN` สูงสุดหนึ่งรอบ

### `ParkingViolation`

- `id`: UUID Primary Key
- `cycleId`: Foreign Key ไป `ViolationCycle`
- `sequenceNumber`: ลำดับภายในรอบ คำนวณโดย Backend; `NULL` เมื่อยกเลิก
- `occurredAt`: เวลาที่เกิดเหตุ
- `status`: `WARNING`, `PENDING_FINE`, `PAID` หรือ `CANCELLED`
- `note`: หมายเหตุแบบ Nullable
- `createdAt`, `updatedAt`: เวลาสร้างและแก้ไข

Frontend ห้ามส่ง `sequenceNumber` หรือยอดค่าปรับ

### `Fine`

แทนยอดค่าปรับล่าสุดของรอบ มีสูงสุดหนึ่งรายการต่อรอบ

- `id`: UUID Primary Key
- `cycleId`: Foreign Key แบบ Unique ไป `ViolationCycle`
- `amountBaht`: ยอดเต็มจำนวน หน่วยบาทแบบ Integer
- `status`: `PENDING`, `PAID` หรือ `CANCELLED`
- `createdAt`, `updatedAt`: เวลาสร้างและแก้ไข

เมื่อจำนวนรายการที่ไม่ถูกยกเลิกเป็น `N` และ `N >= 3`:

```text
1,000 + ((N - 3) × 500) บาท
```

ครั้งที่ 3 เท่ากับ 1,000 บาท ครั้งที่ 4 เท่ากับ 1,500 บาท และเพิ่ม 500 บาทต่อครั้ง

### `FinePayment`

- `id`: UUID Primary Key
- `fineId`: Foreign Key แบบ Unique ไป `Fine`
- `amountBaht`: ยอดชำระ หน่วยบาทแบบ Integer
- `paidAt`: เวลาชำระ
- `reference`: เลขอ้างอิงแบบ Nullable
- `createdAt`: เวลาสร้าง

ยอดชำระต้องเท่ากับ `Fine.amountBaht` ณ เวลาชำระ ไม่รองรับแบ่งชำระหรือชำระเกิน

### `Evidence`

- `id`: UUID Primary Key
- `violationId`: Foreign Key ไป `ParkingViolation`
- `objectKey`: ตำแหน่งไฟล์ใน Object Storage; ต้องไม่ซ้ำ
- `fileName`: ชื่อไฟล์ต้นฉบับ
- `mimeType`: MIME Type
- `sizeBytes`: ขนาดไฟล์
- `createdAt`: เวลาสร้าง

ไม่เก็บ Binary File ใน PostgreSQL

### `AuditLog`

ไม่ผูก Foreign Key กับ Entity ต้นทาง เพื่อรักษาประวัติเมื่อ Entity เปลี่ยนสถานะ

- `id`: UUID Primary Key
- `entityType`: ชนิด Entity
- `entityId`: UUID ของ Entity
- `action`: `CREATE`, `UPDATE`, `CANCEL`, `PAY` หรือ `RESEQUENCE`
- `before`: ข้อมูลก่อนเปลี่ยนแบบ `JSONB` และ Nullable
- `after`: ข้อมูลหลังเปลี่ยนแบบ `JSONB` และ Nullable
- `actorType`: `SYSTEM` หรือ `USER`
- `actorId`: UUID ผู้กระทำแบบ Nullable
- `actorLabel`: ชื่อแสดงผลแบบ Nullable
- `createdAt`: เวลาสร้าง

ระยะที่ยังไม่มี Authentication ใช้ `actorType = SYSTEM`

## Enums

```text
CycleStatus: OPEN, CLOSED
ViolationStatus: WARNING, PENDING_FINE, PAID, CANCELLED
FineStatus: PENDING, PAID, CANCELLED
AuditAction: CREATE, UPDATE, CANCEL, PAY, RESEQUENCE
AuditActorType: SYSTEM, USER
```

## Constraints และ Indexes

- Prisma Model และ Field ใช้ `PascalCase`/`camelCase`; ชื่อตารางและคอลัมน์ PostgreSQL ใช้ `snake_case` ผ่าน `@@map` และ `@map`
- `House.code` และ `House.sequenceNumber` ต้องไม่ซ้ำ
- `House.sequenceNumber >= 1`
- `ViolationCycle.cycleNumber >= 1`
- `ParkingViolation.sequenceNumber >= 1` หรือ `NULL` เมื่อ `CANCELLED`
- `(cycleId, sequenceNumber)` ต้องไม่ซ้ำสำหรับลำดับที่ไม่เป็น `NULL`
- `Fine.amountBaht >= 0`
- `FinePayment.amountBaht > 0`
- `Evidence.sizeBytes >= 0`
- Index ที่ `ViolationCycle.houseId`, `ParkingViolation.cycleId`, `ParkingViolation.occurredAt`, `Evidence.violationId` และ `AuditLog(entityType, entityId, createdAt)`
- Foreign Keys ของข้อมูลธุรกิจใช้ `ON DELETE RESTRICT`

Initial Migration เพิ่ม Partial Unique Index:

```sql
CREATE UNIQUE INDEX "violation_cycles_one_open_per_house"
ON "violation_cycles" ("house_id")
WHERE "status" = 'OPEN';
```

ข้อกำหนดที่ Prisma Schema แสดงไม่ได้ครบ เช่น Partial Index และ Check Constraints เพิ่มเป็น SQL ใน Migration

## ธุรกรรมและกฎการเปลี่ยนสถานะในระยะถัดไป

### สร้างรายการกระทำผิด

Business Service ในอนาคตทำใน Transaction Isolation Level `Serializable`:

1. ค้นหารอบ `OPEN` ของบ้าน หรือสร้างเมื่อยังไม่มี
2. นับรายการที่ไม่ใช่ `CANCELLED`
3. กำหนด `sequenceNumber` ถัดไปโดย Backend
4. ลำดับ 1–2 ใช้ `WARNING`; ลำดับ 3 ขึ้นไปใช้ `PENDING_FINE`
5. สร้างหรือปรับ `Fine` ตามสูตร
6. เขียน `AuditLog`

เมื่อเกิด Serialization Conflict ให้ Backend Retry แบบจำกัดครั้ง Partial Unique Index ป้องกันรอบเปิดซ้ำระดับ Database

### ยกเลิกรายการ

1. เปลี่ยนรายการเป็น `CANCELLED` และตั้ง `sequenceNumber = NULL`
2. เรียงรายการที่เหลือตาม `occurredAt`; ใช้ `createdAt` และ `id` เป็น Tie-breaker
3. คำนวณสถานะและยอด `Fine` ใหม่
4. หากเหลือน้อยกว่า 3 รายการ เปลี่ยน Fine เป็น `CANCELLED`
5. หากภายหลังกลับมาครบ 3 รายการ ใช้ Fine เดิม เปลี่ยนเป็น `PENDING` และตั้งยอดใหม่
6. เขียน Audit สำหรับการยกเลิกและการเปลี่ยนลำดับทั้งหมด

รายการในรอบที่ชำระแล้วห้ามแก้หรือยกเลิก จนกว่าจะออกแบบ Reversal Workflow

### ชำระค่าปรับ

1. ตรวจว่า Fine เป็น `PENDING` และยอดชำระตรงยอดเต็ม
2. สร้าง `FinePayment` หนึ่งรายการ
3. เปลี่ยน Fine เป็น `PAID`
4. เปลี่ยนรายการลำดับ 3 ขึ้นไปจาก `PENDING_FINE` เป็น `PAID`; ลำดับ 1–2 คง `WARNING`
5. เปลี่ยน Cycle เป็น `CLOSED` และตั้ง `closedAt`
6. เขียน `AuditLog`

ยังไม่สร้าง Cycle ใหม่ทันที รายการกระทำผิดครั้งถัดไปเริ่ม Cycle ใหม่

## นโยบายการลบ

- `House`, `ViolationCycle`, `ParkingViolation`, `Fine` และ `FinePayment` ห้าม Hard Delete
- ปิดบ้านด้วย `House.isActive = false`
- ยกเลิกรายการด้วย `CANCELLED`
- การลบ Evidence ในอนาคตต้องลบ Object Storage และ Metadata ผ่าน Service เดียว พร้อม Audit Log
- การย้อนรายการชำระแล้วอยู่นอก Scope; ต้องมี Reversal Workflow

## PostgreSQL บน Docker Compose

Docker Compose มี Service เดียว ใช้ Image `postgres:18.4-alpine3.23` พร้อม:

- Database, User และ Password จาก Environment Variables
- Port `${POSTGRES_PORT:-5432}:5432`
- Named Volume Mount ที่ `/var/lib/postgresql` ตาม PostgreSQL 18
- Healthcheck ด้วย `pg_isready`
- Restart Policy สำหรับ Local Development

ไม่เพิ่ม Container สำหรับ Backend, Frontend, Object Storage หรือ Prisma Studio

## Prisma 7 และ NestJS Integration

```text
apps/backend/prisma.config.ts
apps/backend/prisma/schema.prisma
apps/backend/prisma/migrations/
apps/backend/prisma/seed.ts
apps/backend/src/generated/prisma/
apps/backend/src/database/database.module.ts
apps/backend/src/database/prisma.service.ts
```

- Generator `prisma-client`; Output `../src/generated/prisma`
- `moduleFormat = "cjs"` ให้ตรง Runtime NestJS ปัจจุบัน
- PostgreSQL Driver Adapter ผ่าน `@prisma/adapter-pg` และ `pg`
- Datasource URL ใน `prisma.config.ts` จาก `DATABASE_URL`
- โหลด Environment ด้วย `dotenv`
- `PrismaService` เชื่อมต่อและปิด Connection ตาม Nest Lifecycle
- `DatabaseModule` Export `PrismaService`
- Backend หยุดพร้อม Error ชัดเจนเมื่อไม่มีหรืออ่าน `DATABASE_URL` ไม่ได้

Runtime Dependencies:

```text
@prisma/client
@prisma/adapter-pg
pg
dotenv
```

Development Dependencies:

```text
prisma
tsx
@types/pg
```

## Environment Variables

เพิ่มใน `.env.example` โดยไม่ Commit Secret จริง:

```dotenv
POSTGRES_DB=spk_r5_parking_log
POSTGRES_USER=spk_r5
POSTGRES_PASSWORD=change-me
POSTGRES_PORT=5432
DATABASE_URL=postgresql://spk_r5:change-me@localhost:5432/spk_r5_parking_log
```

ค่าตัวอย่างใช้เฉพาะ Local Development Production ต้องใช้ Secret Management

## Seed บ้าน 164 หลัง

- `sequenceNumber` 1 ถึง 164
- `code` `R5-001` ถึง `R5-164` ด้วย Zero Padding 3 หลัก
- ใช้ `upsert` โดยค้นจาก `code` ภายใน Transaction; กรณีพบข้อมูลเดิมใช้ `update: {}`
- รันซ้ำได้ จำนวนบ้านยังเท่ากับ 164
- ไม่เขียนทับ `actualHouseNumber`, `isActive` หรือข้อมูลบ้านเดิม
- ไม่ลบบ้านหรือข้อมูลธุรกิจเดิม

## การจัดการข้อผิดพลาด

- PostgreSQL Healthcheck ต้องผ่านก่อน Migration หรือ Seed
- Migration Error หยุดกระบวนการทันที
- Seed ใช้ Transaction เพื่อ Rollback ทั้งชุดเมื่อผิดพลาด
- Missing `DATABASE_URL` รายงานชื่อ Environment Variable ที่ขาด
- ห้าม Log Connection String เต็ม เพราะอาจมี Password
- Constraint Violation ต้องรักษา Error ต้นเหตุ เพื่อแปลงเป็น Domain Error ในระยะถัดไป

## การทดสอบและเกณฑ์ยอมรับ

- `prisma format` และ `prisma validate` ผ่าน
- Initial Migration ทำงานกับ Database ว่าง
- Migration Status ไม่มี Pending Migration หลัง Apply
- Seed รอบแรกสร้างบ้านครบ 164 หลัง
- Seed รอบสองไม่เพิ่มจำนวนและไม่เขียนทับ `actualHouseNumber`
- Code ครบ `R5-001` ถึง `R5-164` โดยไม่ซ้ำ
- `sequenceNumber` ครบ 1–164 โดยไม่ซ้ำ
- Database connectivity test ผ่าน `PrismaService`
- Existing Backend Unit Tests และ E2E Tests ผ่าน
- Workspace Lint และ Build ผ่าน

## ขอบเขตที่ไม่รวม

- CRUD API และ Business Service
- Authentication และ Authorization
- Object Storage หรือ MinIO Container
- Upload/Download Evidence
- Partial Payment, Overpayment, Refund หรือ Payment Reversal
- UI และ Frontend Integration
- Production Deployment และ Backup Strategy

## แหล่งอ้างอิง

- [Prisma ORM 7 Upgrade Guide](https://docs.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Prisma ORM with NestJS](https://docs.prisma.io/docs/guides/frameworks/nestjs)
- [Prisma Config Reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference)
- [PostgreSQL Docker Official Image](https://hub.docker.com/_/postgres)
