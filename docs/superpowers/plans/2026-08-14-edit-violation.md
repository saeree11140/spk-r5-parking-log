# Edit Violation Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development while implementing this plan task by task.

**Goal:** Let ADMIN and STAFF edit a non-cancelled violation's occurrence date/time and note while its cycle is open and contains no paid fine, then automatically resequence every violation and recalculate fines in that cycle.

**Architecture:** Add a shared `UpdateViolationInput` contract and a NestJS `PATCH /api/houses/:houseCode/violations/:violationId` endpoint. The service performs authorization-independent business checks and the update inside the existing serializable transaction helper, delegates derived sequence/status/fine changes to `resequenceCycle`, and writes an `UPDATE` audit record. The Next.js UI opens a prefilled edit modal from each eligible table row, sends the patch, and invalidates the existing parking queries.

**Tech Stack:** TypeScript, NestJS, Prisma/PostgreSQL, Next.js/React, TanStack Query, React Hook Form, Zod, Jest/Supertest, Vitest/Testing Library.

---

## Task 1: Shared input contract and backend DTO

**Files:**

- Modify: `packages/shared-types/src/index.ts`
- Create: `apps/backend/src/violations/update-violation.dto.ts`
- Create: `apps/backend/src/violations/update-violation.dto.spec.ts`

### Step 1: Write the failing DTO tests

Cover these cases with `plainToInstance` + `validate`:

- accepts a timezone-qualified ISO `occurredAt` and a trimmed note;
- accepts omitted `note` without adding a value;
- converts blank `note` to `null` so a saved note can be cleared;
- rejects future/malformed/missing-zone dates through the same validation rules as create;
- rejects a note longer than 1,000 characters.

Expected shape:

```ts
const dto = plainToInstance(UpdateViolationDto, {
  occurredAt: '2026-08-14T10:00:00+07:00',
  note: '  แก้ไขหมายเหตุ  ',
});
expect(await validate(dto)).toHaveLength(0);
expect(dto.note).toBe('แก้ไขหมายเหตุ');
```

### Step 2: Run the DTO test and confirm RED

Run:

```bash
pnpm --filter backend test -- update-violation.dto.spec.ts --runInBand
```

Expected: FAIL because `UpdateViolationDto` does not exist.

### Step 3: Add the shared contract and DTO

Add to shared types:

```ts
export interface UpdateViolationInput {
  occurredAt: string;
  note?: string | null;
}
```

Implement `UpdateViolationDto` with the create DTO's ISO/timezone/past-date validators. For `note`, preserve omission, trim strings, and map a trimmed empty string to `null`; declare it as `note?: string | null` with optional/string/max-length validation.

### Step 4: Run targeted tests and type contract check

Run:

```bash
pnpm --filter backend test -- update-violation.dto.spec.ts --runInBand
pnpm --filter @spk-r5-parking-log/shared-types test
```

Expected: PASS.

### Step 5: Commit this slice

```bash
git add packages/shared-types/src/index.ts apps/backend/src/violations/update-violation.dto.ts apps/backend/src/violations/update-violation.dto.spec.ts
git commit -m "feat: add violation update contract"
```

## Task 2: Backend update service and route

**Files:**

- Modify: `apps/backend/src/violations/violations.service.spec.ts`
- Modify: `apps/backend/src/violations/violations.service.ts`
- Modify: `apps/backend/src/violations/violations.controller.spec.ts`
- Modify: `apps/backend/src/violations/violations.controller.ts`

### Step 1: Write failing service tests

Add `describe('ViolationsService.update', ...)` using the existing Prisma mocks. Cover:

- returns `VIOLATION_NOT_FOUND` when the id is not under `houseCode`;
- returns `CYCLE_CLOSED` for a closed cycle;
- returns `VIOLATION_ALREADY_CANCELLED` for a cancelled violation;
- returns `PAID_CYCLE_IMMUTABLE` when any fine in the cycle is paid;
- on success updates `occurredAt` and an explicit `note: null`, calls `resequenceCycle` behavior through the transaction, writes `ParkingViolation/UPDATE` before-and-after audit data, and returns the refreshed mutation response;
- when `note` is omitted, does not overwrite the stored note.

Use an explicit property-presence assertion for the last case:

```ts
expect(prisma.parkingViolation.update).toHaveBeenCalledWith(
  expect.objectContaining({ data: { occurredAt: expect.any(Date) } }),
);
```

### Step 2: Run service tests and confirm RED

Run:

```bash
pnpm --filter backend test -- violations.service.spec.ts --runInBand
```

Expected: FAIL because `ViolationsService.update` does not exist.

### Step 3: Implement `ViolationsService.update`

Parse `occurredAt` before starting the transaction. Inside `runSerializable`:

1. Find the violation scoped by id and house code, including cycle and fine.
2. Apply the closed/cancelled/paid-cycle checks in that order.
3. Build the update without conflating omitted and cleared notes:

```ts
const hasNote = Object.prototype.hasOwnProperty.call(dto, 'note');
const updated = await tx.parkingViolation.update({
  where: { id: violation.id },
  data: {
    occurredAt,
    ...(hasNote ? { note: dto.note ?? null } : {}),
  },
});
```

4. Call `resequenceCycle(tx, violation.cycleId, actor)`; do not alter `cycle.openedAt`.
5. Write an `UPDATE` audit with old/new `occurredAt` and `note`.
6. Return `loadMutationResponse` after resequencing.

### Step 4: Write the failing controller test

Add a test that calls `controller.update(...)` and expects the service to receive normalized route parameters, DTO, and audit actor.

Run:

```bash
pnpm --filter backend test -- violations.controller.spec.ts --runInBand
```

Expected: FAIL because the controller has no update method.

### Step 5: Add the PATCH controller action

Import `Patch` and `UpdateViolationDto`, then add:

```ts
@Patch(':houseCode/violations/:violationId')
update(
  @Param() params: ViolationRouteDto,
  @Body() dto: UpdateViolationDto,
  @CurrentUser() user: AuthenticatedUser,
): Promise<ViolationMutationResponse> {
  return this.violations.update(
    params.houseCode,
    params.violationId,
    dto,
    toAuditActor(user),
  );
}
```

Class-level roles and CSRF handling remain unchanged.

### Step 6: Run backend unit tests

Run:

```bash
pnpm --filter backend test -- violations.service.spec.ts violations.controller.spec.ts update-violation.dto.spec.ts --runInBand
```

Expected: PASS.

### Step 7: Commit this slice

```bash
git add apps/backend/src/violations
git commit -m "feat: add violation update endpoint"
```

## Task 3: Backend API integration coverage

**Files:**

- Modify: `apps/backend/test/core-parking-api.e2e-spec.ts`

### Step 1: Add a failing E2E happy-path test

Create three violations in one open cycle, patch the latest violation to an earlier `occurredAt` and a new note, then assert:

- HTTP 200 and updated note/time;
- sequence numbers are reordered chronologically;
- warning/fine status and fine amounts are recalculated according to the new order;
- a subsequent `GET /api/houses/:houseCode` reflects the same order and values.

### Step 2: Add failing E2E immutability tests

Cover at least:

- blank note clears the existing note;
- a cancelled violation returns 409 `VIOLATION_ALREADY_CANCELLED`;
- a cycle with a paid fine returns 409 `PAID_CYCLE_IMMUTABLE`.

### Step 3: Run E2E and confirm RED, then GREEN

Run before and after any integration fixes:

```bash
pnpm --filter backend test:e2e -- --runInBand
```

Expected before route/service implementation is wired: FAIL with 404/405. Expected after: PASS with the database-backed resequence assertions.

### Step 4: Commit this slice

```bash
git add apps/backend/test/core-parking-api.e2e-spec.ts
git commit -m "test: cover editing violations end to end"
```

## Task 4: Frontend API and form schema

**Files:**

- Modify: `apps/frontend/src/lib/api/parking-api.spec.ts`
- Modify: `apps/frontend/src/lib/api/parking-api.ts`
- Modify: `apps/frontend/src/lib/forms/schemas.spec.ts`
- Modify: `apps/frontend/src/lib/forms/schemas.ts`

### Step 1: Write failing API client test

Assert `parkingApi.updateViolation('A/1', 'violation/1', input)` calls:

```ts
expect(apiClient.patch).toHaveBeenCalledWith(
  '/houses/A%2F1/violations/violation%2F1',
  input,
);
```

### Step 2: Write failing edit-schema tests

Add `editViolationSchema(now)` tests for the same date/time rules as create, trimmed notes, and blank notes producing `undefined` at form level. The modal will deliberately translate that blank value to API `null`.

### Step 3: Run and confirm RED

Run:

```bash
pnpm --filter frontend test:run -- src/lib/api/parking-api.spec.ts src/lib/forms/schemas.spec.ts
```

Expected: FAIL because the update method/schema do not exist.

### Step 4: Implement the client and schema

Import `UpdateViolationInput`, add `apiClient.patch<ViolationMutationResponse>`, and export `editViolationSchema` plus `EditViolationFormInput`/`EditViolationFormValues`. Reuse the common violation field schema factory so create and edit validation cannot drift.

### Step 5: Run targeted tests

Run:

```bash
pnpm --filter frontend test:run -- src/lib/api/parking-api.spec.ts src/lib/forms/schemas.spec.ts
```

Expected: PASS.

### Step 6: Commit this slice

```bash
git add apps/frontend/src/lib/api/parking-api.ts apps/frontend/src/lib/api/parking-api.spec.ts apps/frontend/src/lib/forms/schemas.ts apps/frontend/src/lib/forms/schemas.spec.ts
git commit -m "feat: add frontend violation update client"
```

## Task 5: Edit modal and table action

**Files:**

- Create: `apps/frontend/src/features/violations/edit-violation-modal.tsx`
- Create: `apps/frontend/src/features/violations/edit-violation-modal.spec.tsx`
- Modify: `apps/frontend/src/features/houses/cycle-history.tsx`
- Modify: `apps/frontend/src/features/houses/house-detail-page.tsx`
- Modify: `apps/frontend/src/features/houses/house-detail-page.spec.tsx`

### Step 1: Write failing modal tests

Following the create/cancel modal test setup, verify:

- initial date/time and note are prefilled from the selected violation;
- submitting changed values calls `parkingApi.updateViolation` with ISO date/time and the trimmed note;
- clearing the note sends `note: null`;
- success invalidates parking queries, closes the modal, and reports `แก้ไข Violation แล้ว`;
- API errors stay visible and do not close the modal.

### Step 2: Run modal test and confirm RED

Run:

```bash
pnpm --filter frontend test:run -- src/features/violations/edit-violation-modal.spec.tsx
```

Expected: FAIL because `EditViolationModal` does not exist.

### Step 3: Implement `EditViolationModal`

Copy the established modal/form/mutation structure, but initialize from the selected violation:

```ts
defaultValues: {
  occurredAt: toDateTimeLocalValue(new Date(violation.occurredAt)),
  note: violation.note ?? '',
}
```

Submit with:

```ts
mutation.mutate({
  occurredAt: localDateTimeToIso(values.occurredAt),
  note: values.note ?? null,
});
```

Use title `แก้ไข Violation`, pending label `กำลังบันทึก...`, and the existing query invalidation helper.

### Step 4: Write failing page/action tests

Extend house detail tests to assert:

- eligible rows show `แก้ไข Violation ครั้งที่ N` before the cancel action;
- clicking opens a prefilled edit modal;
- cancelled rows, closed cycles, and cycles with `paidFineCount > 0` do not show Edit;
- successful editing shows the success notice.

### Step 5: Run page test and confirm RED

Run:

```bash
pnpm --filter frontend test:run -- src/features/houses/house-detail-page.spec.tsx
```

Expected: FAIL because no edit action/dialog is wired.

### Step 6: Wire the action and dialog

Add `onEditViolation` to `CycleHistoryProps`. Compute:

```ts
const canEdit =
  cycle.status === 'OPEN' &&
  cycle.paidFineCount === 0 &&
  violation.status !== 'CANCELLED';
```

Render the Edit button before Cancel. Extend `ActiveDialog` with `{ type: 'edit'; violation }`, pass the callback into `CycleHistory`, and render `EditViolationModal` for that dialog state.

### Step 7: Run frontend tests

Run:

```bash
pnpm --filter frontend test:run -- src/features/violations/edit-violation-modal.spec.tsx src/features/houses/house-detail-page.spec.tsx src/lib/api/parking-api.spec.ts src/lib/forms/schemas.spec.ts
```

Expected: PASS.

### Step 8: Commit this slice

```bash
git add apps/frontend/src/features/violations apps/frontend/src/features/houses/cycle-history.tsx apps/frontend/src/features/houses/house-detail-page.tsx apps/frontend/src/features/houses/house-detail-page.spec.tsx
git commit -m "feat: add violation edit workflow"
```

## Task 6: Documentation and complete verification

**Files:**

- Modify: `README.md`
- Modify: `apps/frontend/README.md`

### Step 1: Update documentation

Document the PATCH route, editable fields, eligibility rule, automatic resequencing/fine recalculation, and the Edit action in the cycle history table.

### Step 2: Run formatting on touched files

Run:

```bash
pnpm exec prettier --write packages/shared-types/src/index.ts apps/backend/src/violations apps/backend/test/core-parking-api.e2e-spec.ts apps/frontend/src/lib/api/parking-api.ts apps/frontend/src/lib/api/parking-api.spec.ts apps/frontend/src/lib/forms/schemas.ts apps/frontend/src/lib/forms/schemas.spec.ts apps/frontend/src/features/violations apps/frontend/src/features/houses/cycle-history.tsx apps/frontend/src/features/houses/house-detail-page.tsx apps/frontend/src/features/houses/house-detail-page.spec.tsx README.md apps/frontend/README.md
```

### Step 3: Run all static and automated checks

Run:

```bash
pnpm test
pnpm --filter backend test:e2e -- --runInBand
pnpm lint
pnpm build
git diff --check
```

Expected: all commands exit 0.

### Step 4: Browser acceptance test

With the local stack running and an ADMIN/STAFF session:

1. Open a house with an editable open cycle.
2. Confirm Edit appears before Cancel.
3. Change date/time so the violation moves earlier in the cycle and change the note.
4. Save and confirm the success notice, reordered sequence, recalculated status/fine, and updated note without manual refresh.
5. Clear the note and confirm the table shows `—`.
6. Confirm Edit is absent for cancelled rows, closed cycles, and cycles containing a paid fine.

### Step 5: Request code review and resolve findings

Use `superpowers:requesting-code-review` over the implementation diff. Fix important findings and rerun the affected tests plus the complete verification suite.

### Step 6: Commit documentation/final cleanup

```bash
git add README.md apps/frontend/README.md
git commit -m "docs: document violation editing"
```

Do not include unrelated pre-existing worktree changes in these commits.
