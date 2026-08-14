# Edit Violation Design

## Goal

เพิ่ม action แก้ไขวันเวลาเกิดเหตุและหมายเหตุของ Violation จากตารางประวัติ Cycle โดยรักษาลำดับ, Fine และ Audit Log ให้ถูกต้อง

## Scope

- เพิ่มปุ่ม `แก้ไข` ในคอลัมน์จัดการ
- ใช้ modal แยกสำหรับแก้วันเวลาเกิดเหตุและหมายเหตุ
- เพิ่ม Backend API สำหรับแก้ Violation
- Resequence Violation และคำนวณ Fine ใหม่หลังเปลี่ยนวันเวลา
- ไม่เพิ่มสิทธิ์ใหม่, schema database ใหม่ หรือการแก้สถานะ/Fine โดยตรง

## Business Rules

แก้ได้เมื่อครบทุกข้อ:

1. Violation อยู่ในบ้านตาม route
2. Cycle เป็น `OPEN`
3. Violation ไม่เป็น `CANCELLED`
4. ไม่มี Fine `PAID` ใน Cycle

`occurredAt` ต้องเป็น ISO 8601 พร้อม timezone และไม่เป็นอนาคต `note` trim แล้วต้องยาวไม่เกิน 1,000 ตัวอักษร ค่า `null` หรือข้อความว่างใช้ล้างหมายเหตุเดิม

หลังแก้ ระบบเรียง Active Violations ด้วย `occurredAt`, `createdAt`, `id` แล้วคำนวณ `sequenceNumber`, status และ Fine ใหม่ด้วย rule เดิม การแก้ไม่เปลี่ยน `cycle.openedAt`

## API Contract

เพิ่ม route:

```text
PATCH /api/houses/:houseCode/violations/:violationId
```

Request:

```json
{
  "occurredAt": "2026-08-14T10:30:00+07:00",
  "note": "รายละเอียดเพิ่มเติม"
}
```

Shared type:

```ts
interface UpdateViolationInput {
  occurredAt: string;
  note?: string | null;
}
```

ถ้าไม่ส่ง `note` ให้คงค่าเดิม ถ้าส่ง `null` หรือข้อความว่างให้ล้างค่า ตอบ `ViolationMutationResponse` เหมือน Create/Cancel

Route ใช้ `ADMIN`/`STAFF`, Authentication, CSRF และ Origin rule เดิม

## Backend Flow

`ViolationsService.update()` ทำงานใน Serializable Transaction:

1. Parse และ validate `occurredAt`
2. หา Violation ตาม `houseCode` และ `violationId` พร้อม Cycle/Fine
3. ปฏิเสธด้วย error เดิม: `VIOLATION_NOT_FOUND`, `CYCLE_CLOSED`, `VIOLATION_ALREADY_CANCELLED`, `PAID_CYCLE_IMMUTABLE`
4. Update `occurredAt` และ update `note` เฉพาะเมื่อ request ส่ง field นี้
5. เรียก `resequenceCycle()`
6. เขียน Audit action `UPDATE` พร้อมค่า `occurredAt` และ `note` ก่อน/หลัง
7. โหลด Violation และ Cycle summary หลัง resequence

## Frontend Flow

ตารางแสดงปุ่ม `แก้ไข` ก่อน `ยกเลิก` เมื่อ rule อนุญาต ปุ่มเปิด `EditViolationModal` พร้อมค่าปัจจุบัน:

- `occurredAt` แปลงเป็น `datetime-local` ใน Asia/Bangkok
- `note` ใช้ข้อความเดิมหรือค่าว่าง

Modal ใช้ validation เดียวกับ Create, เรียก `parkingApi.updateViolation()`, invalidate house/dashboard queries, ปิด modal และแสดงข้อความ `แก้ไข Violation แล้ว` เมื่อสำเร็จ ระหว่าง submit ปิดซ้ำไม่ได้ และ error แสดงใน modal

## Tests

Backend:

- DTO trim/length/timezone validation
- Update date/note สำเร็จและ Audit ถูกต้อง
- เปลี่ยน date แล้ว resequence/status/Fine ถูกต้อง
- ล้าง note ด้วย `null` หรือข้อความว่าง
- ปฏิเสธ not found, closed cycle, cancelled violation, paid cycle และเวลาอนาคต
- Controller ส่ง actor และ response ถูกต้อง
- E2E ยืนยัน PATCH, response และ house detail หลังแก้

Frontend:

- Shared/API contract และ PATCH path/body
- Modal prefill, validation, submit, success/error
- ปุ่ม Edit แสดงเฉพาะรายการแก้ได้
- House Detail เปิด/ปิด modal, invalidate/refetch แล้วแสดงค่าล่าสุด
- Keyboard: initial focus, Escape และ focus return ใช้ Modal primitive เดิม

## Out of Scope

- แก้ Cancelled Violation หรือ Closed/Paid Cycle
- แก้ status, sequence, Fine หรือ payment โดยตรง
- Bulk edit และ inline cell editing
- เปลี่ยน Cycle ของ Violation
