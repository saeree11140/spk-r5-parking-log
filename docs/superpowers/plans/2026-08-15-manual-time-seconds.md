# Manual Time Input with Seconds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every editable time field a manual native `HH:mm:ss` input with no visible WebKit picker indicator while preserving Bangkok conversion and validation.

**Architecture:** Extend the frontend local date-time boundary to canonical second precision and keep minute-only values as accepted compatibility input. Add a shared shadcn-style `Input` primitive, then use it in the existing controlled `DateTimePickerField`; all three modal forms inherit the behavior without API or backend changes.

**Tech Stack:** React 19, TypeScript, date-fns, React Hook Form, Base UI Popover, Vitest, Testing Library.

## Global Constraints

- Editable time format is `HH:mm:ss` with `type="time"` and `step="1"`.
- Hide `::-webkit-calendar-picker-indicator`; users enter time manually.
- Canonical frontend values are `YYYY-MM-DDTHH:mm:ss`; accept minute-only input by adding `:00`.
- Preserve Buddhist date display, min/max rules, Asia/Bangkok ISO conversion, and exact note-only edit timestamps.
- Tables remain minute precision; backend, database, and shared API types do not change.

---

### Task 1: Second-Precision Date Helpers

**Files:**
- Modify: `apps/frontend/src/lib/date-time.spec.ts`
- Modify: `apps/frontend/src/lib/date-time.ts`
- Modify: `apps/frontend/src/lib/forms/schemas.spec.ts`

**Interfaces:**
- Produces: `toDateTimeLocalValue(value): YYYY-MM-DDTHH:mm:ss`, `toDateTimeLocalCeilingValue(value): YYYY-MM-DDTHH:mm:ss`, and existing validators accepting minute or second precision.

- [ ] **Step 1: Write failing helper tests**

Add literal expectations:

```ts
expect(toDateTimeLocalValue("2026-07-01T03:00:45.123Z")).toBe(
  "2026-07-01T10:00:45",
);
expect(toDateTimeLocalCeilingValue("2026-07-01T03:00:45.123Z")).toBe(
  "2026-07-01T10:00:46",
);
expect(localDateTimeToIso("2026-07-01T10:00:45")).toBe(
  "2026-07-01T03:00:45.000Z",
);
expect(localDateTimeToIso("2026-07-01T10:00")).toBe(
  "2026-07-01T03:00:00.000Z",
);
expect(
  isLocalDateTimeInRange(
    "2026-08-14T17:30:01",
    undefined,
    "2026-08-14T17:30:00",
  ),
).toBe(false);
```

Add schema tests proving `10:00:01` is future when now is `10:00:00`, and payment `09:00:00` is not before a violation at exactly that second.

- [ ] **Step 2: Run tests and verify RED**

```bash
TZ=UTC pnpm --filter frontend exec vitest run src/lib/date-time.spec.ts src/lib/forms/schemas.spec.ts
```

Expected: FAIL because helpers currently parse and output minute precision and ceiling rounds to a minute.

- [ ] **Step 3: Implement optional-second parsing and canonical-second output**

Change the normalized regex to capture optional seconds:

```ts
const LOCAL_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
```

Default the missing capture to `"00"`, validate seconds through `setUTCHours(hour, minute, second, 0)`, and include seconds in `toDateTimeLocalValue`.

Round ceiling to whole seconds:

```ts
const remainder = date.getTime() % 1_000;
const roundedDate =
  remainder === 0 ? date : new Date(date.getTime() + 1_000 - remainder);
```

Remove `formatDateTimeInputValue`, `parseDateTimeInputValue`, `maskDateTimeInputValue`, their Buddhist combined-input regex, and obsolete unit tests.

- [ ] **Step 4: Run helper/schema tests and verify GREEN**

```bash
TZ=UTC pnpm --filter frontend exec vitest run src/lib/date-time.spec.ts src/lib/forms/schemas.spec.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/lib/date-time.ts apps/frontend/src/lib/date-time.spec.ts apps/frontend/src/lib/forms/schemas.spec.ts
git commit -m "feat(frontend): support second-precision form times"
```

### Task 2: Manual Shared Time Input

**Files:**
- Create: `apps/frontend/src/components/ui/input.tsx`
- Modify: `apps/frontend/src/components/ui/date-time-picker.spec.tsx`
- Modify: `apps/frontend/src/components/ui/date-time-picker.tsx`
- Modify: `apps/frontend/src/app/globals.css`

**Interfaces:**
- Consumes: second-precision helpers from Task 1.
- Produces: shared `Input` and `DateTimePickerField` rendering manual `HH:mm:ss` time.

- [ ] **Step 1: Write failing picker tests**

Update the harness value to `2026-08-14T17:30:45` and assert:

```tsx
const time = screen.getByLabelText("เวลา วันเวลาเกิดเหตุ");
expect(time).toHaveAttribute("type", "time");
expect(time).toHaveAttribute("step", "1");
expect(time).toHaveClass("date-time-picker__time-input");
expect(time).toHaveValue("17:30:45");

fireEvent.change(time, { target: { value: "18:45:12" } });
expect(onChange).toHaveBeenLastCalledWith("2026-08-14T18:45:12");
```

Add compatibility coverage: an initial `2026-08-14T17:30` displays `17:30:00` and emits canonical seconds after a date selection.

- [ ] **Step 2: Run picker tests and verify RED**

```bash
TZ=UTC pnpm --filter frontend exec vitest run src/components/ui/date-time-picker.spec.tsx
```

Expected: FAIL because the picker regex rejects seconds, uses a native input directly, and has `step="60"`.

- [ ] **Step 3: Add the shared Input primitive**

Create:

```tsx
import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} className={className} {...props} />;
  },
);
```

- [ ] **Step 4: Canonicalize picker seconds and render Input**

Allow optional seconds in the component normalized/time regexes, but always return `HH:mm:ss` from parsed parts and always emit seconds from `normalizedFromParts`.

Replace the time element with:

```tsx
<Input
  ref={forwardedRef}
  aria-label={`เวลา ${label}`}
  className="date-time-picker__time-input appearance-none"
  disabled={disabled}
  name={name}
  step="1"
  type="time"
  value={timeValue}
  onBlur={onBlur}
  onChange={(event) => handleTimeChange(event.target.value)}
/>
```

- [ ] **Step 5: Hide the native dropdown indicator**

Add:

```css
.date-time-picker__time-input {
  appearance: none;
  background: var(--surface);
}

.date-time-picker__time-input::-webkit-calendar-picker-indicator {
  display: none;
  appearance: none;
}
```

- [ ] **Step 6: Run picker tests, typecheck, and verify GREEN**

```bash
TZ=UTC pnpm --filter frontend exec vitest run src/components/ui/date-time-picker.spec.tsx
pnpm --filter frontend typecheck
```

Expected: both commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/components/ui/input.tsx apps/frontend/src/components/ui/date-time-picker.tsx apps/frontend/src/components/ui/date-time-picker.spec.tsx apps/frontend/src/app/globals.css
git commit -m "feat(frontend): use manual time input with seconds"
```

### Task 3: Second-Precision Form Integrations

**Files:**
- Modify: `apps/frontend/src/features/violations/create-violation-modal.spec.tsx`
- Modify: `apps/frontend/src/features/violations/edit-violation-modal.spec.tsx`
- Modify: `apps/frontend/src/features/payments/mark-fine-paid-modal.spec.tsx`
- Modify: `apps/frontend/src/features/houses/house-detail-page.spec.tsx`

**Interfaces:**
- Consumes: canonical second-precision form values.
- Produces: verified ISO payloads with seconds across all consumers.

- [ ] **Step 1: Update integration fixtures and assertions**

Use second values such as:

```tsx
fireEvent.change(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ"), {
  target: { value: "10:00:45" },
});
expect(parkingApi.createViolation).toHaveBeenCalledWith(
  "R5-001",
  expect.objectContaining({ occurredAt: "2026-07-01T03:00:45.000Z" }),
);
```

Update prefill expectations to `10:00:00`. Keep payment sub-second lower-bound coverage using a minimum of `10:00:46`. Keep the note-only edit expectation at the original `.123Z` timestamp.

- [ ] **Step 2: Run integration tests**

```bash
TZ=UTC pnpm --filter frontend exec vitest run src/features/violations/create-violation-modal.spec.tsx src/features/violations/edit-violation-modal.spec.tsx src/features/payments/mark-fine-paid-modal.spec.tsx src/features/houses/house-detail-page.spec.tsx
```

Expected: 4 files PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/violations/create-violation-modal.spec.tsx apps/frontend/src/features/violations/edit-violation-modal.spec.tsx apps/frontend/src/features/payments/mark-fine-paid-modal.spec.tsx apps/frontend/src/features/houses/house-detail-page.spec.tsx
git commit -m "test(frontend): cover second-precision time inputs"
```

### Task 4: Full Verification

**Files:**
- Verify: entire workspace.

- [ ] **Step 1: Run full automated verification**

```bash
TZ=UTC pnpm test
pnpm --filter backend test:e2e --runInBand
pnpm --recursive typecheck
pnpm lint
pnpm build
```

Expected: every command exits 0.

- [ ] **Step 2: Run browser smoke test**

At a narrow viewport, verify the time control displays seconds, accepts typed `HH:mm:ss`, has no visible picker indicator, fits the modal, and produces no app console errors. Do not submit the form.

- [ ] **Step 3: Inspect final state**

```bash
git diff --check
git status --short --branch
```

Expected: no whitespace errors and a clean worktree.
