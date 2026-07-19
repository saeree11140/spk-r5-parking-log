# Core Parking API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้าง House Query, Create/Cancel Violation และ Mark Fine Paid API พร้อมกฎค่าปรับราย Violation, Serializable Transactions และ Audit Log

**Architecture:** NestJS แยก `HousesModule`, `ViolationsModule`, `PaymentsModule` ใช้ Prisma โดยตรงผ่าน Application Services Business Rules และ Transaction Retry แยกเป็นหน่วยเล็กทดสอบได้ ทุก Mutation และ Audit ทำใน Transaction เดียวกัน

**Tech Stack:** Node.js 22 LTS, NestJS 11, TypeScript, class-validator, Jest, PostgreSQL 18.4, Prisma ORM 7.8

## Global Constraints

- Route อ้างบ้านด้วย `houseCode` รูปแบบ `R5-001` ถึง `R5-164`
- Backend คำนวณ Sequence, Violation Status และ Fine ทั้งหมด; Frontend ห้ามส่งค่าดังกล่าว
- ครั้ง 1–2 ไม่มี Fine; ครั้ง 3 มี Fine 1,000 บาท; ครั้ง 4 ขึ้นไปมี Fine รายการละ 500 บาท
- Fine แยกต่อ Violation และ Mark Paid แยกกัน
- ระบบบันทึก Offline Paid Status เท่านั้น ห้ามเพิ่ม Payment Gateway, Card Data, Webhook หรือ Payment Session
- Fine ทุกใบที่ไม่ Cancelled เป็น `PAID` จึงปิด Cycle
- Evidence, Authentication, Frontend Integration, Hard Delete และ Payment Reversal อยู่นอก Scope
- ทุก Mutation ใช้ `Serializable`; Retry Prisma `P2034` สูงสุด 3 Attempts
- Audit ใช้ `actorType = SYSTEM`, `actorLabel = core-api`
- ใช้ Node `$HOME/.nvm/versions/node/v22.17.0/bin` สำหรับ pnpm ในเครื่องนี้

---

## File Structure

- `apps/backend/prisma/schema.prisma`: Fine ต่อ Violation, Cancellation Fields, `CLOSE` Audit Action
- `apps/backend/prisma/migrations/202607190002_core_parking_api/migration.sql`: Safe Schema Migration และ Check Constraints
- `apps/backend/src/common/domain-error.ts`: Stable Domain Errors
- `apps/backend/src/common/api-exception.filter.ts`: Error Envelope กลาง
- `apps/backend/src/common/serializable-transaction.ts`: Retry `P2034` สูงสุด 3 Attempts
- `apps/backend/src/common/date-time.ts`: ISO 8601 timezone/future validation helpers
- `apps/backend/src/parking/parking-rules.ts`: Fine และ Resequence Pure Rules
- `apps/backend/src/audit/audit-log.ts`: เขียน Audit ผ่าน Transaction Client
- `apps/backend/src/houses/*`: House Query API และ Response Types
- `apps/backend/src/violations/*`: Create/Cancel DTO, Controller, Service และ Resequence Persistence
- `apps/backend/src/payments/*`: Mark-paid DTO, Controller และ Service
- `apps/backend/test/core-parking-api.e2e-spec.ts`: PostgreSQL-backed API Contract Tests
- `packages/shared-types/src/index.ts`: Public API Response Types
- `README.md`: Core API Documentation

---

### Task 1: เปลี่ยน Prisma Schema เป็น Fine ราย Violation

**Files:**

- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/202607190002_core_parking_api/migration.sql`
- Modify: `apps/backend/test/database.e2e-spec.ts`

**Interfaces:**

- Consumes: Initial Database Migration
- Produces: `ParkingViolation.fine`, `Fine.violationId`, `Fine.paidAt`, `Fine.reference`, `AuditAction.CLOSE`

- [ ] **Step 1: แก้ Prisma Schema**

แก้ Models/Enum เป็น:

```prisma
enum AuditAction {
  CREATE
  UPDATE
  CANCEL
  PAY
  RESEQUENCE
  CLOSE

  @@map("audit_action")
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

  @@unique([houseId, cycleNumber])
  @@index([houseId])
  @@map("violation_cycles")
}

model ParkingViolation {
  id                 String          @id @default(uuid()) @db.Uuid
  cycleId            String          @map("cycle_id") @db.Uuid
  sequenceNumber     Int?            @map("sequence_number")
  occurredAt         DateTime        @map("occurred_at") @db.Timestamptz(3)
  status             ViolationStatus
  note               String?
  cancelledAt        DateTime?       @map("cancelled_at") @db.Timestamptz(3)
  cancellationReason String?         @map("cancellation_reason") @db.VarChar(500)
  createdAt          DateTime        @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt          DateTime        @updatedAt @map("updated_at") @db.Timestamptz(3)
  cycle              ViolationCycle  @relation(fields: [cycleId], references: [id], onDelete: Restrict)
  fine               Fine?
  evidence           Evidence[]

  @@unique([cycleId, sequenceNumber])
  @@index([cycleId])
  @@index([occurredAt])
  @@map("parking_violations")
}

model Fine {
  id          String           @id @default(uuid()) @db.Uuid
  violationId String           @unique @map("violation_id") @db.Uuid
  amountBaht  Int              @map("amount_baht")
  status      FineStatus
  paidAt      DateTime?        @map("paid_at") @db.Timestamptz(3)
  reference   String?          @db.VarChar(128)
  createdAt   DateTime         @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt   DateTime         @updatedAt @map("updated_at") @db.Timestamptz(3)
  violation   ParkingViolation @relation(fields: [violationId], references: [id], onDelete: Restrict)

  @@map("fines")
}
```

ลบ Model `FinePayment` ทั้งหมด

- [ ] **Step 2: Validate Schema ก่อน Migration**

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm --filter backend exec prisma format
pnpm --filter backend prisma:validate
```

Expected: Schema valid

- [ ] **Step 3: สร้าง Migration แบบหยุดเมื่อมี Fine Data**

สร้าง Migration SQL เทียบ Database ปัจจุบันกับ Schema ใหม่:

```bash
mkdir -p apps/backend/prisma/migrations/202607190002_core_parking_api
cd apps/backend
pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script --output prisma/migrations/202607190002_core_parking_api/migration.sql
cd ../..
```

จากนั้นแทรก Precondition ก่อน DDL ที่เปลี่ยน Fine และตรวจว่า Generated SQL มีการเปลี่ยนแปลงต่อไปนี้ครั้งเดียว:

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "fines") OR EXISTS (SELECT 1 FROM "fine_payments") THEN
    RAISE EXCEPTION 'core parking API migration requires empty fines and fine_payments tables';
  END IF;
END $$;

ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'CLOSE';
ALTER TABLE "parking_violations"
  ADD COLUMN "cancelled_at" TIMESTAMPTZ(3),
  ADD COLUMN "cancellation_reason" VARCHAR(500);

DROP TABLE "fine_payments";
ALTER TABLE "fines" DROP CONSTRAINT "fines_cycle_id_fkey";
DROP INDEX "fines_cycle_id_key";
ALTER TABLE "fines"
  DROP COLUMN "cycle_id",
  ADD COLUMN "violation_id" UUID NOT NULL,
  ADD COLUMN "paid_at" TIMESTAMPTZ(3),
  ADD COLUMN "reference" VARCHAR(128);
CREATE UNIQUE INDEX "fines_violation_id_key" ON "fines"("violation_id");
ALTER TABLE "fines" ADD CONSTRAINT "fines_violation_id_fkey"
  FOREIGN KEY ("violation_id") REFERENCES "parking_violations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "parking_violations" DROP CONSTRAINT "parking_violations_sequence_matches_status";
ALTER TABLE "parking_violations" ADD CONSTRAINT "parking_violations_state_consistent" CHECK (
  ("status" = 'CANCELLED' AND "sequence_number" IS NULL AND "cancelled_at" IS NOT NULL
    AND char_length("cancellation_reason") BETWEEN 5 AND 500)
  OR ("status" <> 'CANCELLED' AND "sequence_number" >= 1
    AND "cancelled_at" IS NULL AND "cancellation_reason" IS NULL)
);

ALTER TABLE "fines" DROP CONSTRAINT "fines_amount_baht_non_negative";
ALTER TABLE "fines" ADD CONSTRAINT "fines_state_consistent" CHECK (
  ("status" = 'PENDING' AND "amount_baht" IN (500, 1000) AND "paid_at" IS NULL AND "reference" IS NULL)
  OR ("status" = 'PAID' AND "amount_baht" IN (500, 1000) AND "paid_at" IS NOT NULL)
  OR ("status" = 'CANCELLED' AND "amount_baht" = 0 AND "paid_at" IS NULL AND "reference" IS NULL)
);
```

- [ ] **Step 4: เพิ่ม Integration Assertion แล้ว Apply**

เพิ่มชื่อ Constraints ใหม่และตรวจ `fine_payments` ไม่มีใน `apps/backend/test/database.e2e-spec.ts` จากนั้นรัน:

```bash
pnpm db:migrate
pnpm db:status
pnpm --filter backend test:e2e database.e2e-spec.ts --runInBand
```

Expected: Migration applied; constraints test PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/prisma apps/backend/test/database.e2e-spec.ts
git commit -m "feat: model fines per violation"
```

### Task 2: Domain Rules, Retry และ Error Envelope แบบ Test-first

**Files:**

- Create: `apps/backend/src/parking/parking-rules.spec.ts`
- Create: `apps/backend/src/parking/parking-rules.ts`
- Create: `apps/backend/src/common/serializable-transaction.spec.ts`
- Create: `apps/backend/src/common/serializable-transaction.ts`
- Create: `apps/backend/src/common/domain-error.ts`
- Create: `apps/backend/src/common/api-exception.filter.ts`
- Modify: `apps/backend/src/main.ts`

**Interfaces:**

- Produces: `fineAmountForSequence(number): 0 | 500 | 1000`, `buildSequencePlan`, `runSerializable`, `DomainError`

- [ ] **Step 1: เขียน Failing Fine/Sequence Tests**

```ts
import { buildSequencePlan, fineAmountForSequence } from './parking-rules';

describe('parking rules', () => {
  it.each([
    [1, 0],
    [2, 0],
    [3, 1000],
    [4, 500],
    [5, 500],
  ])('maps sequence %i to fine %i', (sequence, amount) =>
    expect(fineAmountForSequence(sequence)).toBe(amount),
  );

  it('builds deterministic statuses and total 2000 through violation five', () => {
    const plan = buildSequencePlan(['a', 'b', 'c', 'd', 'e']);
    expect(plan.map(({ status }) => status)).toEqual([
      'WARNING',
      'WARNING',
      'PENDING_FINE',
      'PENDING_FINE',
      'PENDING_FINE',
    ]);
    expect(plan.reduce((sum, item) => sum + item.fineAmountBaht, 0)).toBe(2000);
  });
});
```

Run: `pnpm --filter backend test parking-rules.spec.ts --runInBand`

Expected: FAIL module missing

- [ ] **Step 2: Implement Pure Rules**

```ts
import type { ViolationStatus } from '../generated/prisma/enums';

export interface SequencePlanItem {
  id: string;
  sequenceNumber: number;
  status: ViolationStatus;
  fineAmountBaht: 0 | 500 | 1000;
}

export function fineAmountForSequence(sequenceNumber: number): 0 | 500 | 1000 {
  if (sequenceNumber < 3) return 0;
  return sequenceNumber === 3 ? 1000 : 500;
}

export function buildSequencePlan(ids: readonly string[]): SequencePlanItem[] {
  return ids.map((id, index) => {
    const sequenceNumber = index + 1;
    const fineAmountBaht = fineAmountForSequence(sequenceNumber);
    return {
      id,
      sequenceNumber,
      status: fineAmountBaht === 0 ? 'WARNING' : 'PENDING_FINE',
      fineAmountBaht,
    };
  });
}
```

Run test again; Expected: PASS

- [ ] **Step 3: เขียน Failing Transaction Retry Tests**

ทดสอบว่า `P2034` สำเร็จใน attempt 3, error อื่นไม่ retry, และ `P2034` ครั้งที่ 3 ถูกโยนต่อ

```ts
const operation = jest
  .fn()
  .mockRejectedValueOnce({ code: 'P2034' })
  .mockRejectedValueOnce({ code: 'P2034' })
  .mockResolvedValue('ok');
await expect(runSerializable(prisma, operation)).resolves.toBe('ok');
expect(operation).toHaveBeenCalledTimes(3);
```

Run: `pnpm --filter backend test serializable-transaction.spec.ts --runInBand`

Expected: FAIL module missing

- [ ] **Step 4: Implement Retry Utility**

```ts
import { Prisma } from '../generated/prisma/client';
import type { PrismaClient } from '../generated/prisma/client';

export async function runSerializable<T>(
  prisma: PrismaClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error: unknown) {
      const retryable =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2034';
      if (!retryable || attempt === 3) throw error;
    }
  }
  throw new Error('Unreachable transaction retry state');
}
```

- [ ] **Step 5: Implement Domain Error และ Global Filter**

```ts
export class DomainError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
```

`ApiExceptionFilter` ต้อง map `DomainError` ตรง ๆ, `HttpException` เป็น `VALIDATION_ERROR`/`HTTP_ERROR`, error อื่นเป็น `500 INTERNAL_ERROR` โดยไม่คืน stack จากนั้นเพิ่มใน `main.ts`:

```ts
app.useGlobalFilters(new ApiExceptionFilter());
```

เพิ่ม Filter Unit Tests สำหรับทั้งสามกรณี ก่อน implementation

- [ ] **Step 6: Verify และ Commit**

```bash
pnpm --filter backend test --runInBand
pnpm --filter backend lint
git add apps/backend/src/common apps/backend/src/parking apps/backend/src/main.ts
git commit -m "feat: add parking domain foundations"
```

### Task 3: House Summary และ Detail API แบบ Test-first

**Files:**

- Create: `apps/backend/src/houses/house-code.dto.ts`
- Create: `apps/backend/src/houses/houses.types.ts`
- Create: `apps/backend/src/houses/houses.service.spec.ts`
- Create: `apps/backend/src/houses/houses.service.ts`
- Create: `apps/backend/src/houses/houses.controller.spec.ts`
- Create: `apps/backend/src/houses/houses.controller.ts`
- Create: `apps/backend/src/houses/houses.module.ts`
- Modify: `apps/backend/src/app.module.ts`
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**

- Produces: `list(): Promise<HouseSummary[]>`, `getByCode(code): Promise<HouseDetail>`

- [ ] **Step 1: Define Shared Response Types**

เพิ่ม Types ต่อไปนี้ใน Shared Types โดย DateTime ส่งเป็น ISO String:

```ts
export interface FineResponse {
  id: string;
  amountBaht: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  paidAt: string | null;
  reference: string | null;
}

export interface ViolationResponse {
  id: string;
  sequenceNumber: number | null;
  occurredAt: string;
  status: ViolationStatus;
  note: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  fine: FineResponse | null;
}

export interface CycleSummary {
  id: string;
  cycleNumber: number;
  violationCount: number;
  pendingFineCount: number;
  pendingAmountBaht: number;
}

export interface HouseSummary {
  id: string;
  code: string;
  sequenceNumber: number;
  actualHouseNumber: string | null;
  isActive: boolean;
  currentCycle: CycleSummary | null;
}
```

`CycleResponse` เพิ่ม `status`, `openedAt`, `closedAt`, Fine totals และ `violations`; `HouseDetail` ใช้ House fields เดิมพร้อม `cycles: CycleResponse[]`

- [ ] **Step 2: Write Failing Service Tests**

ทดสอบ List เรียงบ้าน, คำนวณ `violationCount`, `pendingFineCount`, `pendingAmountBaht`; Detail เรียง Cycle ใหม่ไปเก่า, Active ก่อน Cancelled; Missing House โยน `HOUSE_NOT_FOUND`

Run: `pnpm --filter backend test houses.service.spec.ts --runInBand`

Expected: FAIL service missing

- [ ] **Step 3: Implement Query Service**

ใช้ Prisma `findMany` พร้อม Open Cycle/Violations/Fines และ `findUnique` พร้อมทุก Cycle จากนั้น map ด้วย functions แยก `mapHouseSummary`/`mapHouseDetail`; ห้าม Query ต่อบ้านแบบ N+1

```ts
async list(): Promise<HouseSummary[]> {
  const houses = await this.prisma.house.findMany({
    orderBy: { sequenceNumber: 'asc' },
    include: {
      cycles: {
        where: { status: 'OPEN' },
        take: 1,
        include: { violations: { include: { fine: true } } },
      },
    },
  });
  return houses.map(mapHouseSummary);
}
```

- [ ] **Step 4: Write Controller Tests แล้ว Implement**

```ts
@Controller('houses')
export class HousesController {
  constructor(private readonly houses: HousesService) {}
  @Get() list(): Promise<HouseSummary[]> {
    return this.houses.list();
  }
  @Get(':houseCode') get(@Param() params: HouseCodeDto): Promise<HouseDetail> {
    return this.houses.getByCode(params.houseCode);
  }
}
```

`HouseCodeDto.houseCode` ใช้ `@Matches(/^R5-(00[1-9]|0[1-9][0-9]|1[0-5][0-9]|16[0-4])$/)`

- [ ] **Step 5: Verify และ Commit**

```bash
pnpm --filter backend test houses --runInBand
pnpm --filter backend build
git add apps/backend/src/houses apps/backend/src/app.module.ts packages/shared-types/src/index.ts
git commit -m "feat: add house query API"
```

### Task 4: Create Violation และ Resequence แบบ Test-first

**Files:**

- Create: `apps/backend/src/common/date-time.spec.ts`
- Create: `apps/backend/src/common/date-time.ts`
- Create: `apps/backend/src/audit/audit-log.ts`
- Create: `apps/backend/src/violations/create-violation.dto.ts`
- Create: `apps/backend/src/violations/violation-resequence.ts`
- Create: `apps/backend/src/violations/violations.service.spec.ts`
- Create: `apps/backend/src/violations/violations.service.ts`
- Create: `apps/backend/src/violations/violations.controller.ts`
- Create: `apps/backend/src/violations/violations.module.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**

- Produces: `create(houseCode, dto)`, `resequenceCycle(tx, cycleId)`, Create Violation Endpoint

- [ ] **Step 1: Date/DTO RED-GREEN**

ทดสอบ timezone required, future rejected, note trim/max 1,000 แล้ว implement `parsePastDateTime(value: string, now: Date): Date` และ DTO ใช้ `@Transform` Trim String ก่อน Validate

`writeAudit` มี Interface เดียว:

```ts
export async function writeAudit(
  tx: Prisma.TransactionClient,
  entityType: string,
  entityId: string,
  action: AuditAction,
  before: Prisma.InputJsonValue | null,
  after: Prisma.InputJsonValue | null,
): Promise<void>;
```

- [ ] **Step 2: Service Failing Tests**

Mock Transaction Client และทดสอบ: house missing/inactive, create first cycle, backdate before closed cycle rejected, backdate after paid rejected, sequence 1–5 และ total Fine 2,000, Audit ถูกเรียก

- [ ] **Step 3: Implement Resequence Persistence**

`resequenceCycle` โหลด Active Violations เรียง `occurredAt`, `createdAt`, `id`; ใช้ `buildSequencePlan`; update Violation; upsert Fine 1,000/500; Fine ที่หลุดเป็น `CANCELLED` ยอด 0; Fine `PAID` คงเดิมและห้ามเปลี่ยน

- [ ] **Step 4: Implement Create Transaction**

```ts
async create(houseCode: string, dto: CreateViolationDto): Promise<CreateViolationResponse> {
  const occurredAt = parsePastDateTime(dto.occurredAt, new Date());
  return runSerializable(this.prisma, async (tx) => {
    const house = await tx.house.findUnique({ where: { code: houseCode } });
    if (!house) throw new DomainError(404, 'HOUSE_NOT_FOUND', 'House not found');
    if (!house.isActive) throw new DomainError(409, 'HOUSE_INACTIVE', 'House is inactive');
    const cycle = await this.findOrCreateOpenCycle(tx, house, occurredAt);
    await this.assertBackdateAllowed(tx, cycle.id, occurredAt);
    const violation = await tx.parkingViolation.create({
      data: { cycleId: cycle.id, occurredAt, status: 'WARNING', note: dto.note },
    });
    await resequenceCycle(tx, cycle.id);
    await writeAudit(tx, 'ParkingViolation', violation.id, 'CREATE', null, violation);
    return this.loadCreateResponse(tx, violation.id);
  });
}
```

- [ ] **Step 5: Controller และ Module**

เพิ่ม `POST :houseCode/violations`, HTTP 201, `HouseCodeDto`, DTO validation และ import Module ใน AppModule

- [ ] **Step 6: Verify และ Commit**

```bash
pnpm --filter backend test violations --runInBand
pnpm --filter backend lint
git add apps/backend/src/common apps/backend/src/audit apps/backend/src/violations apps/backend/src/app.module.ts
git commit -m "feat: create and sequence parking violations"
```

### Task 5: Cancel Violation แบบ Test-first

**Files:**

- Create: `apps/backend/src/violations/cancel-violation.dto.ts`
- Create: `apps/backend/src/violations/violation-route.dto.ts`
- Modify: `apps/backend/src/violations/violations.service.spec.ts`
- Modify: `apps/backend/src/violations/violations.service.ts`
- Modify: `apps/backend/src/violations/violations.controller.ts`

**Interfaces:**

- Produces: `cancel(houseCode, violationId, dto)`, Cancel Endpoint

- [ ] **Step 1: Write Failing Tests**

ทดสอบ reason 4/501 chars fail, missing/mismatched Violation 404, closed/already-cancelled/any-paid 409, successful cancel sets fields, resequences, cancels obsolete Fine, writes Audit

- [ ] **Step 2: Implement DTO และ Service**

```ts
export class CancelViolationDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
```

`cancel()` ใช้ `runSerializable`, query Violation ผ่าน `id + cycle.house.code`, assert Cycle OPEN และไม่มี Fine PAID, update Cancellation Fields, call `resequenceCycle`, write `CANCEL` Audit และคืน Cycle Summary

- [ ] **Step 3: Add Endpoint**

```ts
@Post(':houseCode/violations/:violationId/cancel')
cancel(
  @Param() params: ViolationRouteDto,
  @Body() dto: CancelViolationDto,
): Promise<CancelViolationResponse> {
  return this.violations.cancel(params.houseCode, params.violationId, dto);
}
```

`ViolationRouteDto` extends House Code validation และใช้ `@IsUUID()` สำหรับ `violationId`

- [ ] **Step 4: Verify และ Commit**

```bash
pnpm --filter backend test violations --runInBand
git add apps/backend/src/violations
git commit -m "feat: cancel and resequence violations"
```

### Task 6: Mark Fine Paid และ Auto-close Cycle แบบ Test-first

**Files:**

- Create: `apps/backend/src/payments/mark-fine-paid.dto.ts`
- Create: `apps/backend/src/payments/payments.service.spec.ts`
- Create: `apps/backend/src/payments/payments.service.ts`
- Create: `apps/backend/src/payments/payments.controller.ts`
- Create: `apps/backend/src/payments/payments.module.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**

- Produces: `markPaid(houseCode, violationId, dto)`, Mark-paid Endpoint

- [ ] **Step 1: Write Failing Tests**

ทดสอบ: missing Fine 404, Fine already paid/Cycle closed 409, paidAt future/before violation 400, partial paid keeps Cycle OPEN, final paid closes Cycle at latest Fine paidAt, Audit PAY/CLOSE

- [ ] **Step 2: Implement DTO และ Service**

```ts
export class MarkFinePaidDto {
  @IsISO8601({ strict: true })
  paidAt!: string;
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(128)
  reference?: string;
}
```

`markPaid()` ใช้ Serializable Transaction, update Fine/Violation, count `PENDING`, เมื่อ 0 query max Fine `paidAt` แล้ว close Cycle, write `PAY` และ `CLOSE` Audit; ไม่รับ amount

- [ ] **Step 3: Add Endpoint และ Module**

```ts
@Post(':houseCode/violations/:violationId/mark-paid')
markPaid(@Param() params: ViolationRouteDto, @Body() dto: MarkFinePaidDto) {
  return this.payments.markPaid(params.houseCode, params.violationId, dto);
}
```

- [ ] **Step 4: Verify และ Commit**

```bash
pnpm --filter backend test payments --runInBand
pnpm --filter backend build
git add apps/backend/src/payments apps/backend/src/app.module.ts
git commit -m "feat: mark violation fines paid"
```

### Task 7: PostgreSQL E2E, Concurrency, Documentation และ Full Verification

**Files:**

- Create: `apps/backend/test/core-parking-api.e2e-spec.ts`
- Modify: `README.md`

**Interfaces:**

- Consumes: ทุก Core API Endpoint
- Produces: Verified API Contract และ Setup Documentation

- [ ] **Step 1: Write E2E Scenario ก่อนแก้ Production เพิ่มเติม**

ใช้บ้าน Test ที่ reset ผ่าน SQL/Prisma ใน `beforeEach`; ทดสอบ:

1. GET list มี 164 บ้าน
2. สร้าง 5 Violations ได้ Sequence 1–5 และ Fine 0,0,1000,500,500
3. House Detail รวม Fine 2,000
4. Mark Paid สองใบแรก Cycle ยัง OPEN
5. Mark Paid ใบสุดท้าย Cycle CLOSED
6. Create ถัดไป Cycle 2 Sequence 1
7. Cancel/Backdate ก่อน Paid สำเร็จ
8. Cancel/Backdate หลัง Paid คืน Stable 409 Codes
9. Invalid DTO/Unknown Field คืน 400
10. Parallel Create ไม่มี Cycle/Sequence ซ้ำ
11. Audit Rows ครบและ Rollback เมื่อ Mutation Fail

- [ ] **Step 2: Run E2E และแก้เฉพาะ Defects ที่ Test เปิดเผย**

```bash
pnpm --filter backend test:e2e core-parking-api.e2e-spec.ts --runInBand
```

Expected: ทุก Scenario PASS; ถ้า fail ใช้ `superpowers:systematic-debugging` ก่อนแก้

- [ ] **Step 3: Update README**

เพิ่ม Core API Routes, Offline Paid Status Clarification, Fine Examples และ curl ตัวอย่าง Create/Cancel/Mark-paid; Current Scope ต้องตรง spec และระบุ Evidence/Auth/Frontend ยังไม่รวม

- [ ] **Step 4: Full Verification**

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm --filter backend exec prisma format
pnpm --filter backend prisma:validate
pnpm db:status
pnpm --filter backend test --runInBand
pnpm --filter backend test:e2e --runInBand
pnpm lint
pnpm build
git diff --check
```

Expected: Schema valid, migration current, Unit/Integration/E2E 0 failures, Lint/Build Exit 0

- [ ] **Step 5: Commit**

```bash
git add apps/backend/test/core-parking-api.e2e-spec.ts README.md
git commit -m "test: verify core parking API workflows"
```

- [ ] **Step 6: Final State**

```bash
git status --short
git log -8 --oneline
```

Expected: Working Tree สะอาด; 7 Task Commits อยู่บน Feature Branch
