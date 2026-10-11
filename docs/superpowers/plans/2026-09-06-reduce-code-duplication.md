# Reduce Code Duplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Reduce repeated production logic while preserving existing API and UI behavior.

**Architecture:** Extract violation form fields first, then transaction-scoped violation lookup. Keep mutations, payload conversion, and operation-specific business rules in their existing owners. Each task is independently reviewable.

**Tech Stack:** React 19, Next.js 16, React Hook Form, Zod, NestJS, Prisma, Vitest, Jest, jscpd 5.1.2.

**Spec:** User request on 2026-09-06: prioritize fixes from the jscpd audit and prepare a plan. This document records the scope; implementation is a separate task.

## Global Constraints

- Preserve Thai text, validation, focus, disabled state, modal closing, query invalidation, and audit behavior.
- Preserve create payload omission of an empty note; edit sends null when clearing the note.
- Preserve the exact original timestamp when edit changes only the note.
- Keep violation queries and checks inside the existing serializable transaction.
- Add no dependencies, migrations, generic form framework, or arbitrary duplication threshold.
- Read apps/frontend/AGENTS.md and relevant installed Next.js guides before editing frontend code.
- Do not change existing unrelated architecture artifacts.
- Baseline: apps and packages, mild mode, 5 lines, 50 tokens. Production: 117 sources, 16 clone pairs, 246 duplicated lines, 2.42867%. Including tests: 190 sources, 49 pairs, 573 lines, 3.22708%. Some findings overlap or include imports; these counts are not guaranteed removable lines.

## Task 1: Shared violation form fields — highest priority

**Files:**
- Create: `apps/frontend/src/features/violations/violation-form-fields.tsx`
- Modify: `apps/frontend/src/features/violations/create-violation-modal.tsx`
- Modify: `apps/frontend/src/features/violations/edit-violation-modal.tsx`
- Existing tests: corresponding `create-violation-modal.spec.tsx` and `edit-violation-modal.spec.tsx`.

**Interface:** The schemas already share the same fields and structurally identical input/output types. Use a typed form prop; no casts or new schema needed.

```tsx
import type { UseFormReturn } from "react-hook-form";
import type {
  CreateViolationFormInput,
  CreateViolationFormValues,
} from "@/lib/forms/schemas";

type ViolationFormFieldsProps = {
  form: UseFormReturn<CreateViolationFormInput, unknown, CreateViolationFormValues>;
  pending: boolean;
  maximumOccurredAt: string;
};
```

- [x] Run existing modal tests before editing:

```sh
pnpm --filter frontend test:run src/features/violations/create-violation-modal.spec.tsx src/features/violations/edit-violation-modal.spec.tsx
```

- [x] Move the occurredAt Controller and note label/textarea/error from the create modal into `ViolationFormFields`. Preserve ref, name, blur, value, validation messages, maxValue, disabled, rows=4, and maxLength=1001 exactly. The schema continues enforcing trimmed length 1000.
- [x] Replace those same two field blocks in both modals:

```tsx
<ViolationFormFields
  form={form}
  pending={mutation.isPending}
  maximumOccurredAt={maximumOccurredAt}
/>
```

- [x] Remove only the imports made unused by extraction. Keep form tags, IDs, footer, mutation errors, close handlers, schemas, and payload construction in each modal.
- [x] Rerun the modal command, then `pnpm --filter frontend typecheck` and `pnpm --filter frontend lint`. Existing tests must still cover prefill, future dates, long notes, ISO conversion, cleared-note null, preserved original instant, API errors, and query invalidation. Do not add tests that merely assert component extraction.
- [x] Review independently before proceeding. Main duplicated field block should disappear; surrounding imports/footer clones may remain.

## Task 2: Transaction-scoped violation lookup — second priority

**Files:**
- Create: `apps/backend/src/parking/find-open-cycle-violation.ts`
- Modify: `apps/backend/src/payments/payments.service.ts`
- Modify: `apps/backend/src/violations/violations.service.ts`
- Existing tests: `apps/backend/src/payments/payments.service.spec.ts`, `apps/backend/src/violations/violations.service.spec.ts`, `apps/backend/src/common/serializable-transaction.spec.ts`.

**Interface and implementation:**

```ts
import type { Prisma } from '../generated/prisma/client';
import { DomainError } from '../common/domain-error';

export async function findOpenCycleViolation(
  tx: Prisma.TransactionClient,
  houseCode: string,
  violationId: string,
) {
  const violation = await tx.parkingViolation.findFirst({
    where: { id: violationId, cycle: { house: { code: houseCode } } },
    include: { cycle: true, fine: true },
  });
  if (!violation) {
    throw new DomainError(404, 'VIOLATION_NOT_FOUND', 'Violation not found');
  }
  if (violation.cycle.status !== 'OPEN') {
    throw new DomainError(409, 'CYCLE_CLOSED', 'Cycle is closed');
  }
  return violation;
}
```

- [x] Run the service and transaction tests before editing:

```sh
pnpm --filter backend test --runInBand payments.service.spec.ts violations.service.spec.ts serializable-transaction.spec.ts
```

- [x] Compare markPaid, update, and cancel lookup/check order. Replace only matching lookup + not-found + closed-cycle blocks, preserving all earlier checks and all following checks:

```ts
const violation = await findOpenCycleViolation(tx, houseCode, violationId);
```

- [x] Keep cancellation checks, fine status/payment timestamp checks, paid-cycle immutability, resequencing, and audit writes in their original service methods. Pass the callback's tx; the helper must never open another transaction or use the root client.
- [x] Rerun the service/transaction tests, `pnpm --filter backend lint`, and `pnpm --filter backend build`. Verify existing tests still reject missing/mismatched violations, closed cycles, cancelled violations, paid cycles, and invalid payment times, and still assert successful mutations/audits. Keep service tests exercising the real helper rather than mocking it.
- [x] Review independently. The helper should own only genuinely identical rules; do not merge entire payment/update/cancel flows.

## Task 3: User fields — optional follow-up after Tasks 1–2

Lower priority: the matching JSX is small and spans different form types. Reassess after the first two tasks; skip if adapter props would be more complicated than the repeated code.

**Candidate files:** `apps/frontend/src/features/users/create-user-modal.tsx`, `edit-user-modal.tsx`, `reset-password-modal.tsx`; their existing `.spec.tsx` tests.

- [x] Start with the temporary-password field shared by create/reset. If extracted, create `apps/frontend/src/features/users/temporary-password-field.tsx` with this narrow interface:

```tsx
import type { UseFormRegisterReturn } from "react-hook-form";

type TemporaryPasswordFieldProps = {
  registration: UseFormRegisterReturn<"temporaryPassword">;
  error?: string;
};

export function TemporaryPasswordField({ registration, error }: TemporaryPasswordFieldProps) {
  return (
    <label className="form-field">
      <span>รหัสผ่านชั่วคราว</span>
      <input autoComplete="new-password" type="password" {...registration} />
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
```

- [x] Replace only the two identical fields, passing `form.register("temporaryPassword")` and `form.formState.errors.temporaryPassword?.message`. Preserve all schemas, mutations, role options, and success/error text.
- [x] Run `pnpm --filter frontend test:run src/features/users`, `pnpm --filter frontend typecheck`, and `pnpm --filter frontend lint`.
- [x] Leave display-name/role extraction for a separately justified change; do not build a configurable universal user form.

## Final verification

- [x] Run the whole suite once after the selected tasks: `pnpm test`.
- [x] Repeat the exact production scan and compare clone locations as well as totals:

```sh
npx --yes jscpd@5.1.2 apps packages --min-lines 5 --min-tokens 50 --mode mild --ignore '**/node_modules/**,**/generated/**,**/dist/**,**/.next/**,**/coverage/**,**/*.spec.*,**/*.test.*,**/__tests__/**,**/test/**,**/tests/**,**/e2e/**' --reporters json,html --output /tmp/spk-r5-jscpd/after-production --no-colors --no-tips
```

- [x] Confirm selected repeated blocks are gone, no new type casts/dependencies, and no behavior changes. Report before/after numbers without promising a target percentage.
- [x] Leave import duplication, small dashboard/header fragments, and readable test setup alone. Test fixture extraction needs separate evidence of maintenance benefit.

## Plan review

Scope covers priority, exact files, extraction boundaries, preserved semantics, existing regression checks, and repeatable measurement. Tasks 1–2 are recommended; Task 3 is optional. No application source has been changed as part of planning.


## Execution results — 2026-09-06

All three tasks completed in the current workspace. No commit or push performed.

- Extracted ViolationFormFields, findOpenCycleViolation (payment/update/cancel), and TemporaryPasswordField.
- Preserved original payload conversion and operation-specific validation, transaction boundaries, and UI markup.
- Baseline exposed a calendar test dependent on the current month; the full suite exposed the same issue in payment tests. Both test files now freeze Date at 2026-08-15T03:00:00.000Z and restore real timers after each test, keeping actual timers available for UI interactions.
- Final pnpm test passed: backend 129 tests, frontend 128 tests, shared-types TypeScript test compilation passed.
- Frontend typecheck and lint, backend lint and build, formatting checks, and git diff --check passed.
- jscpd production: 16 to 14 clone pairs; 246 to 181 duplicated lines; 2.42867% to 1.78536%; 117 to 120 sources. Detected duplicated lines reduced by 65 (26.4%). Remaining clones include imports, modal handlers/footer/error UI, and operation-specific service checks.
- Report: /tmp/spk-r5-jscpd/after-production/jscpd-report.html
