# เอกสารออกแบบ Core Parking API สำหรับ SPK R5 Parking Log

## เป้าหมาย

สร้าง Backend Vertical Slice สำหรับอ่านข้อมูลบ้าน เพิ่มและยกเลิกการกระทำผิด คำนวณลำดับและค่าปรับรายรายการ และบันทึกสถานะว่าค่าปรับชำระแล้ว โดยระบบนี้ไม่รับชำระเงินจริงและไม่เชื่อมต่อ Payment Gateway

เอกสารนี้เปลี่ยนกฎ Fine และ Payment จากเอกสารออกแบบ Database เดิม: Fine ต้องผูกกับ Violation แต่ละรายการ การกระทำผิดครั้งที่ 3 มี Fine 1,000 บาท และครั้งที่ 4 ขึ้นไปมี Fine เพิ่มรายการละ 500 บาท เมื่อ Fine ทุกใบใน Cycle ชำระแล้วจึงปิด Cycle

## ขอบเขต

รวม:

- House Summary และ House Detail API
- Create Violation
- Cancel Violation พร้อมเหตุผล
- Mark Fine Paid ราย Violation
- Sequence/Fine Calculation โดย Backend
- Serializable Transactions และ Retry
- Audit Log
- Prisma Migration รองรับ Fine ราย Violation
- Unit, Integration และ E2E Tests

ไม่รวม:

- Authentication และ Authorization
- รับเงินจริง, Payment Gateway, Refund หรือ Reversal
- Evidence Metadata, File Upload และ Object Storage
- Frontend Integration
- แก้ไข Violation ทั่วไปหรือ Hard Delete
- Pagination สำหรับบ้าน 164 หลัง

## ข้อตัดสินใจหลัก

- Route อ้างบ้านด้วย `houseCode` เช่น `R5-001`
- Frontend ส่ง `occurredAt` เป็น ISO 8601 พร้อม timezone
- ยกเลิกต้องมีเหตุผล 5–500 ตัวอักษร
- House List คืน Summary; House Detail คืนทุก Cycle
- Fine แยกต่อ Violation
- Mark Paid เป็นการบันทึกสถานะ Offline ไม่ใช่ธุรกรรมการเงินจริง
- `PAID` ย้อนกลับเป็น `PENDING` ไม่ได้ใน Scope นี้
- Evidence อยู่นอก Scope
- ใช้ Nest Application Services ที่เรียก Prisma โดยตรง ไม่เพิ่ม Repository Abstraction

## Architecture

### `HousesModule`

รับผิดชอบ Query เท่านั้น:

- อ่านบ้านทั้ง 164 หลัง เรียง `sequenceNumber`
- อ่านบ้านหนึ่งหลังพร้อมทุก Cycle, Violations และ Fines
- ไม่ทำ Mutation

### `ViolationsModule`

รับผิดชอบ:

- Validate Create/Cancel DTO
- เปิด Cycle ใหม่เมื่อไม่มี Cycle เปิด
- เพิ่ม Violation
- Resequence รายการใน Cycle
- สร้าง ปรับ หรือ Cancel Fine ตามลำดับใหม่
- เขียน Audit Log

### `PaymentsModule`

ชื่อ Module สื่อถึงการบันทึกสถานะค่าปรับ ไม่ประมวลผลเงินจริง:

- Mark Fine ของ Violation เป็น `PAID`
- บันทึก `paidAt` และเลขอ้างอิงแบบ Optional
- ปิด Cycle เมื่อ Fine ทุกใบเป็น `PAID`
- เขียน Audit Log

### Domain Rules

Business Rules แยกเป็น Pure Functions เพื่อทดสอบโดยไม่ต้องใช้ Database:

```text
fineAmountForSequence(1) = 0
fineAmountForSequence(2) = 0
fineAmountForSequence(3) = 1000
fineAmountForSequence(N >= 4) = 500
```

การเรียงลำดับใช้ `occurredAt`, `createdAt`, `id` ตามลำดับ เพื่อให้ผลลัพธ์ Deterministic

## HTTP API

ทุก Route อยู่ใต้ Global Prefix `/api`

```text
GET  /api/houses
GET  /api/houses/:houseCode
POST /api/houses/:houseCode/violations
POST /api/houses/:houseCode/violations/:violationId/cancel
POST /api/houses/:houseCode/violations/:violationId/mark-paid
```

### `GET /api/houses`

คืน HTTP `200` พร้อมบ้าน 164 หลัง เรียง `sequenceNumber`:

```json
[
  {
    "id": "uuid",
    "code": "R5-001",
    "sequenceNumber": 1,
    "actualHouseNumber": null,
    "isActive": true,
    "currentCycle": {
      "id": "uuid",
      "cycleNumber": 1,
      "violationCount": 5,
      "pendingFineCount": 2,
      "pendingAmountBaht": 1000
    }
  }
]
```

`currentCycle` เป็น `null` เมื่อไม่มี Cycle เปิด List Endpoint ไม่คืนประวัติเต็ม

### `GET /api/houses/:houseCode`

คืน HTTP `200` พร้อม:

- ข้อมูลบ้าน
- ทุก Cycle เรียงใหม่ไปเก่า
- Violations ที่ Active เรียง `sequenceNumber`
- Violations ที่ `CANCELLED` อยู่ท้าย Cycle เรียง `occurredAt`
- Fine ของแต่ละ Violation
- ยอด Fine ทั้งหมด ยอด Pending และยอด Paid ต่อ Cycle

ไม่คืน Audit Logs ผ่าน Endpoint นี้

### `POST /api/houses/:houseCode/violations`

Request:

```json
{
  "occurredAt": "2026-07-19T10:30:00+07:00",
  "note": "จอดขวางทางเข้า"
}
```

- `occurredAt`: Required, ISO 8601 พร้อม timezone, ห้ามเป็นอนาคต
- `note`: Optional, Trim, สูงสุด 1,000 ตัวอักษร
- Frontend ห้ามส่ง `sequenceNumber`, `status` หรือ `amountBaht`

คืน HTTP `201` พร้อม Violation, Fine แบบ Nullable และ Cycle Summary หลังคำนวณ

### `POST /api/houses/:houseCode/violations/:violationId/cancel`

Request:

```json
{
  "reason": "บันทึกผิดหลัง"
}
```

- `reason`: Required, Trim, 5–500 ตัวอักษร
- ยกเลิกได้เฉพาะ Violation ใน Cycle เปิด
- ห้ามยกเลิกเมื่อมี Fine ใดใน Cycle เป็น `PAID`

คืน HTTP `200` พร้อม Violation ที่ยกเลิกและ Cycle Summary หลัง Resequence

### `POST /api/houses/:houseCode/violations/:violationId/mark-paid`

Request:

```json
{
  "paidAt": "2026-07-19T15:00:00+07:00",
  "reference": "ใบเสร็จ-001"
}
```

- `paidAt`: Required, ISO 8601 พร้อม timezone, ห้ามเป็นอนาคต และห้ามก่อน `occurredAt` ของ Violation
- `reference`: Optional, Trim, สูงสุด 128 ตัวอักษร
- Request ไม่มี `amountBaht`
- Violation ต้องมี Fine `PENDING`
- Mark Paid ซ้ำหรือย้อนกลับไม่ได้

คืน HTTP `200` พร้อม Fine, Violation และ `cycleClosed` Boolean

## Data Model Migration

### `ParkingViolation`

เพิ่ม:

```text
cancelledAt          DateTime?
cancellationReason  String?
fine                Fine?
```

Constraint:

- `CANCELLED`: `sequenceNumber = NULL`, `cancelledAt != NULL`, `cancellationReason != NULL`
- สถานะอื่น: `sequenceNumber >= 1`, `cancelledAt = NULL`, `cancellationReason = NULL`

### `Fine`

เปลี่ยนจากหนึ่ง Fine ต่อ Cycle เป็นหนึ่ง Fine ต่อ Violation:

```text
violationId  UUID unique
amountBaht   Integer
status       PENDING | PAID | CANCELLED
paidAt       DateTime?
reference    String?
```

ลบ `cycleId` และ Relation เดิม Fine เข้าถึง Cycle ผ่าน `ParkingViolation.cycleId`

Constraints:

- `PENDING`: `amountBaht IN (500, 1000)`, `paidAt = NULL`
- `PAID`: `amountBaht IN (500, 1000)`, `paidAt != NULL`
- `CANCELLED`: `amountBaht = 0`, `paidAt = NULL`
- `PENDING` และ `CANCELLED`: `reference = NULL`; `PAID` มี `reference` แบบ Optional

### `FinePayment`

ลบ Model และ Table เพราะระบบเก็บเพียงสถานะ Offline บน Fine และ Audit Log

Migration ต้องตรวจว่า `fines` และ `fine_payments` ยังไม่มีข้อมูลก่อนเปลี่ยนโครงสร้าง หากมีข้อมูลให้ Migration หยุดแทนการทิ้งข้อมูลเงียบ ๆ ปัจจุบันยังไม่มี API ที่สร้างข้อมูลสองตารางนี้

เพิ่ม `CLOSE` ใน `AuditAction` สำหรับเหตุการณ์ปิด Cycle

## Create Violation Flow

ทำทั้งหมดใน `Serializable` Transaction:

1. Validate บ้านมีอยู่และ `isActive = true`
2. หา Cycle `OPEN`; ถ้าไม่มีให้สร้าง `cycleNumber` ถัดไป
3. ถ้ามี Cycle ปิดล่าสุด `occurredAt` ต้องมากกว่า `closedAt`
4. ถ้า Cycle เปิดมี Fine `PAID` แล้ว `occurredAt` ต้องไม่น้อยกว่า Violation ล่าสุด
5. สร้าง Violation
6. เรียง Active Violations ทั้ง Cycle ใหม่
7. กำหนด `sequenceNumber` และ status
8. ลำดับ 1–2 ไม่มี Fine
9. ลำดับ 3 Upsert Fine 1,000 บาท
10. ลำดับ 4 ขึ้นไป Upsert Fine 500 บาทต่อ Violation
11. Violation ที่หลุดจากช่วงมีค่าปรับเพราะ Resequence ให้ Fine เป็น `CANCELLED`, `amountBaht = 0`
12. เขียน Audit สำหรับ Create, Resequence และ Fine Changes

## Cancel Violation Flow

ทำใน `Serializable` Transaction:

1. ตรวจบ้าน, Cycle และ Violation ตรงกับ Route
2. Cycle ต้อง `OPEN`
3. Cycle ต้องไม่มี Fine `PAID`
4. Violation ต้องไม่ `CANCELLED`
5. ตั้ง `status = CANCELLED`, `sequenceNumber = NULL`, `cancelledAt` และ `cancellationReason`
6. Resequence Active Violations
7. Recalculate Fine ต่อ Violation
8. Fine ที่ไม่ต้องใช้แล้วเป็น `CANCELLED`, `amountBaht = 0`
9. Fine เดิมที่กลับมาอยู่ลำดับมีค่าปรับเป็น `PENDING` พร้อมยอดใหม่
10. เขียน Audit ก่อน Commit

## Mark Paid Flow

ทำใน `Serializable` Transaction:

1. ตรวจบ้าน, Cycle และ Violation ตรงกับ Route
2. Cycle ต้อง `OPEN`
3. Fine ต้องมีอยู่และเป็น `PENDING`
4. ตรวจ `paidAt` ไม่เป็นอนาคตและไม่ก่อน `occurredAt`
5. ตั้ง Fine เป็น `PAID`, บันทึก `paidAt`, `reference`
6. ตั้ง Violation เป็น `PAID`
7. ตรวจ Fine ที่ไม่ `CANCELLED` ทั้ง Cycle
8. หากไม่มี Fine `PENDING` เหลือ ให้ปิด Cycle และตั้ง `closedAt` เป็นค่า `paidAt` ล่าสุดของ Fine ทุกใบใน Cycle
9. เขียน Audit `PAY` และ `CLOSE Cycle` เมื่อปิดรอบ

ระบบไม่เรียก Payment Provider ไม่เก็บข้อมูลบัตร ไม่สร้าง Payment Session และไม่รับ Callback/Webhook

## Concurrency

- ทุก Mutation ใช้ Isolation Level `Serializable`
- Retry เฉพาะ Prisma Serialization/Write Conflict สูงสุด 3 Attempts
- Partial Unique Index `violation_cycles_one_open_per_house` ป้องกัน Cycle เปิดซ้ำ
- Unique `(cycleId, sequenceNumber)` ป้องกันลำดับซ้ำ
- Retry หมดคืน `409 CONCURRENT_MODIFICATION`
- ห้าม Retry Validation, Not Found หรือ Domain Conflict

## Audit Log

ยังไม่มี Authentication จึงใช้:

```text
actorType = SYSTEM
actorLabel = core-api
```

Audit อยู่ใน Transaction เดียวกับ Mutation และเก็บ `before`/`after` แบบ JSONB สำหรับ:

- Create Violation
- Cancel Violation
- Resequence Violation
- Create/Update/Cancel Fine
- Mark Fine Paid
- Close Cycle

## Validation และ Error Handling

`houseCode` ต้องตรง `^R5-(00[1-9]|0[1-9][0-9]|1[0-5][0-9]|16[0-4])$` และ `violationId` ต้องเป็น UUID

Error Envelope:

```json
{
  "statusCode": 409,
  "code": "CYCLE_ALREADY_PAID",
  "message": "Paid cycle cannot be modified"
}
```

HTTP Mapping:

- `400`: Validation และ Invalid Timestamp
- `404`: `HOUSE_NOT_FOUND`, `VIOLATION_NOT_FOUND`, `FINE_NOT_FOUND`
- `409`: `HOUSE_INACTIVE`, `CYCLE_CLOSED`, `FINE_ALREADY_PAID`, `VIOLATION_ALREADY_CANCELLED`, `PAID_CYCLE_IMMUTABLE`, `BACKDATE_NOT_ALLOWED`, `CONCURRENT_MODIFICATION`
- `500`: Unexpected Error โดยไม่เปิดเผย SQL, Stack Trace หรือ Connection String ใน Response

Domain Errors แยกจาก HTTP และ Global Exception Filter แปลงเป็น Error Envelope กลาง

## Testing

### Unit Tests

- Fine Rule: 1–2 = 0, 3 = 1,000, 4 ขึ้นไป = 500
- Violation 5 ครั้งมียอดรวม 2,000 บาท
- Deterministic Resequence
- Cancel แล้ว Fine/Status เปลี่ยนถูกต้อง
- DTO Validation สำหรับ houseCode, UUID, Timestamp, Note, Reason และ Reference
- Retry เฉพาะ Serialization Conflict และหยุดที่ 3 Attempts

### PostgreSQL Integration Tests

- Create, Backdate และ Cancel ก่อนมี Fine Paid
- Sequence/Fine ต่อ Violation ถูกต้อง
- Mark Paid บาง Fine แล้ว Cycle ยังเปิด
- Mark Paid ครบแล้ว Cycle ปิด
- Violation ถัดไปสร้าง Cycle ใหม่และเริ่มลำดับ 1
- ห้าม Cancel หรือ Backdate หลังมี Fine Paid
- Concurrent Create ไม่สร้าง Cycle หรือลำดับซ้ำ
- Audit Commit/Rollback พร้อมข้อมูลธุรกิจ
- Migration Constraints ปฏิเสธข้อมูลผิดรูป

### E2E Tests

- Happy Path ทุก Endpoint
- House Summary และ Detail Shape
- Status Codes และ Stable Domain Error Codes
- Global Validation ปฏิเสธ Unknown Fields
- ระบบไม่สร้าง Route, Dependency หรือ Configuration สำหรับ Online Payment

## เกณฑ์ยอมรับ

- บ้าน 164 หลังอ่านผ่าน API ได้ตามลำดับ
- Backend เป็นผู้คำนวณ Sequence, Status และ Fine ทั้งหมด
- ครั้ง 3 สร้าง Fine 1,000; ครั้ง 4+ สร้าง Fine 500 ต่อรายการ
- ครั้ง 5 มียอด Fine รวม 2,000
- Fine แต่ละใบ Mark Paid แยกได้
- Cycle ปิดเมื่อ Fine ที่ไม่ Cancelled ทุกใบ Paid
- Cancel/Backdate ไม่เปลี่ยนข้อมูลที่ Paid แล้ว
- Mutation และ Audit Atomic
- Unit, Integration, E2E, Lint และ Build ผ่าน
