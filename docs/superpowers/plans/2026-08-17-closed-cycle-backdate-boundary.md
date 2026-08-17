# Closed Cycle Backdate Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** อนุญาตให้ Violation หลังรายการล่าสุดของ Cycle ปิดเริ่ม Cycle ใหม่ได้ แม้เวลาเกิดเหตุอยู่ก่อนเวลาชำระและปิดรอบ

**Architecture:** เปลี่ยนเส้นแบ่ง backdate ใน `ViolationsService.findOrCreateOpenCycle` จาก `ViolationCycle.closedAt` เป็น `occurredAt` ของ Violation ที่ไม่ถูกยกเลิกล่าสุดใน Cycle ล่าสุด Query และ validation อยู่ใน serializable transaction เดิม; API contract, Fine rules และ UI ไม่เปลี่ยน

**Tech Stack:** NestJS 11, TypeScript 5.7, Prisma 7, Jest 30, PostgreSQL 18, Next.js frontend สำหรับ UI verification

## Global Constraints

- HTTP error คง `409`, code `BACKDATE_NOT_ALLOWED`, message `Violation cannot be backdated before closed cycle`
- อนุญาต `occurredAt` เท่ากับหรือหลัง Violation ล่าสุด
- ปฏิเสธเฉพาะ `occurredAt` ก่อน Violation ล่าสุด
- ไม่นับ Violation สถานะ `CANCELLED`
- ไม่แก้ Cycle ปิด, Fine rules, shared API types หรือ UI
- ห้ามรวมไฟล์แก้ค้างของผู้ใช้ใน commit งานนี้

---

### Task 1: Replace closed-time boundary with last-violation boundary

**Files:**
- Modify: `apps/backend/src/violations/violations.service.spec.ts:48-76`
- Modify: `apps/backend/src/violations/violations.service.ts:248-280`

**Interfaces:**
- Consumes: `ViolationsService.create(houseCode, dto, actor)` และ Prisma transaction models เดิม
- Produces: behavior ใหม่ใน `ViolationsService.findOrCreateOpenCycle`; ไม่มี exported API ใหม่

- [ ] **Step 1: Write failing regression test**

เพิ่ม test ต่อไปนี้ใน `describe('ViolationsService.create')` และคง test reject ไว้โดยเปลี่ยน fixture ให้มี `violations`:

```ts
it.each([
  {
    description: 'after the last violation even before the cycle closed',
    latestViolationAt: '2025-10-04T01:50:04Z',
  },
  {
    description: 'at the same time as the last violation',
    latestViolationAt: '2026-07-26T01:50:04Z',
  },
])('starts a new cycle $description', async ({ latestViolationAt }) => {
  const nextOccurredAt = '2026-07-26T08:50:04+07:00';
  const violation = {
    id: '00000000-0000-4000-8000-000000000001',
    cycleId: 'cycle-2',
    sequenceNumber: 1,
    occurredAt: new Date('2026-07-26T01:50:04Z'),
    createdAt: new Date('2026-07-26T01:50:04Z'),
    status: 'WARNING',
    note: 'ผิดระเบียบครั้งที่ 1',
    cancelledAt: null,
    cancellationReason: null,
    fine: null,
  };
  const findCycle = jest
    .fn()
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({
      id: 'cycle-1',
      cycleNumber: 1,
      closedAt: new Date('2026-08-17T01:51:29Z'),
      violations: [{ occurredAt: new Date(latestViolationAt) }],
    });
  const createCycle = jest.fn().mockResolvedValue({
    id: 'cycle-2',
    cycleNumber: 2,
    status: 'OPEN',
  });
  const tx = {
    house: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'house-1', isActive: true }),
    },
    violationCycle: {
      findFirst: findCycle,
      create: createCycle,
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: 'cycle-2',
        cycleNumber: 2,
        status: 'OPEN',
        violations: [violation],
      }),
    },
    parkingViolation: {
      aggregate: jest
        .fn()
        .mockResolvedValue({ _max: { sequenceNumber: null } }),
      create: jest.fn().mockResolvedValue(violation),
      findMany: jest.fn().mockResolvedValue([violation]),
      update: jest.fn().mockResolvedValue(violation),
      findUniqueOrThrow: jest.fn().mockResolvedValue(violation),
    },
    fine: {
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const service = new ViolationsService(prismaFor(tx));

  const result = await service.create(
    'R5-026',
    { occurredAt: nextOccurredAt, note: 'ผิดระเบียบครั้งที่ 1' },
    SYSTEM_ACTOR,
  );

  expect(createCycle).toHaveBeenCalledWith({
    data: {
      houseId: 'house-1',
      cycleNumber: 2,
      status: 'OPEN',
      openedAt: new Date('2026-07-26T01:50:04Z'),
    },
  });
  expect(findCycle).toHaveBeenNthCalledWith(2, {
    where: { houseId: 'house-1' },
    orderBy: { cycleNumber: 'desc' },
    include: {
      violations: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: [
          { occurredAt: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        take: 1,
      },
    },
  });
  expect(result.currentCycle.cycleNumber).toBe(2);
});
```

เปลี่ยน latest-cycle fixture ของ test `rejects a violation before the last closed cycle` เป็น:

```ts
{
  cycleNumber: 1,
  closedAt: new Date('2026-07-19T00:00:00Z'),
  violations: [{ occurredAt: new Date('2026-07-19T04:00:00Z') }],
}
```

- [ ] **Step 2: Run focused test and verify RED**

Run:

```bash
pnpm --filter backend test --runInBand -- violations/violations.service.spec.ts
```

Expected: new regression test FAIL with `Violation cannot be backdated before closed cycle` because current code still compares against `closedAt`.

- [ ] **Step 3: Implement minimal boundary change**

Replace latest-cycle lookup and guard in `findOrCreateOpenCycle` with:

```ts
const latestCycle = await tx.violationCycle.findFirst({
  where: { houseId },
  orderBy: { cycleNumber: 'desc' },
  include: {
    violations: {
      where: { status: { not: 'CANCELLED' } },
      orderBy: [
        { occurredAt: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: 1,
    },
  },
});
const latestViolation = latestCycle?.violations[0];
if (
  latestViolation &&
  occurredAt.getTime() < latestViolation.occurredAt.getTime()
) {
  throw new DomainError(
    409,
    'BACKDATE_NOT_ALLOWED',
    'Violation cannot be backdated before closed cycle',
  );
}
```

คง `violationCycle.create` เดิมไว้

- [ ] **Step 4: Run focused test and verify GREEN**

Run:

```bash
pnpm --filter backend test --runInBand -- violations/violations.service.spec.ts
```

Expected: `18 passed`, `0 failed`.

- [ ] **Step 5: Run backend verification**

Run:

```bash
pnpm --filter backend test --runInBand
pnpm --filter backend lint
pnpm --filter backend build
```

Expected: ทุกคำสั่ง exit `0`; tests `0 failed`; lint ไม่มี error; build สำเร็จ

- [ ] **Step 6: Commit code and regression tests only**

```bash
git add apps/backend/src/violations/violations.service.ts apps/backend/src/violations/violations.service.spec.ts
git commit -m "fix: allow next-cycle violations before payment time"
```

### Task 2: Verify R5-026 through local UI

**Files:**
- Modify: none

**Interfaces:**
- Consumes: `POST /api/houses/R5-026/violations` ผ่านหน้า `http://localhost:3000/houses/R5-026`
- Produces: Cycle 2 ของ `R5-026` พร้อม Violation ครั้งที่ 1 เวลา `26/07/2569 08:50:04`

- [ ] **Step 1: Reload local page after backend hot reload**

เปิด `http://localhost:3000/houses/R5-026`, reload และยืนยัน Cycle 1 ปิดอยู่

- [ ] **Step 2: Submit original failing input**

กรอก:

```text
วันเวลาเกิดเหตุ: 26/07/2569 08:50:04
หมายเหตุ: ผิดระเบียบครั้งที่ 1
```

กด `บันทึก Violation`

- [ ] **Step 3: Verify persisted result**

ยืนยันหน้าแสดง Cycle 2 สถานะเปิด, Violation ครั้งที่ 1, ไม่มี Fine และไม่แสดง `Violation cannot be backdated before closed cycle`

ยืนยัน DB แบบ read-only:

```sql
SELECT vc.cycle_number, vc.status, pv.sequence_number,
       pv.occurred_at AT TIME ZONE 'Asia/Bangkok' AS occurred_bkk,
       pv.note
FROM houses h
JOIN violation_cycles vc ON vc.house_id = h.id
JOIN parking_violations pv ON pv.cycle_id = vc.id
WHERE h.code = 'R5-026'
ORDER BY vc.cycle_number, pv.sequence_number;
```

Expected: Cycle 2 `OPEN`, sequence `1`, `occurred_bkk = 2026-07-26 08:50:04`, note `ผิดระเบียบครั้งที่ 1`
