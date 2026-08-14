# Untitled UI Date Time Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all native date-time inputs with an accessible Untitled UI-based picker that displays and accepts Thai Buddhist dates while preserving Bangkok ISO behavior.

**Architecture:** Add pure display/parse helpers around the existing normalized local date-time contract, then build one controlled React Aria picker and connect it to the three React Hook Form modals with `Controller`. Keep validation in both the picker range boundary and existing Zod schemas; make the custom modal coexist with the portaled popover.

**Tech Stack:** React 19, Next.js 16, TypeScript, React Hook Form, React Aria Components, `@internationalized/date`, Vitest, Testing Library, CSS.

## Global Constraints

- Display/manual format is exactly `DD/MM/BBBB HH:mm` using Buddhist year and Latin digits.
- Time is 24-hour with minute precision from `00:00` through `23:59`.
- Form value remains Gregorian `YYYY-MM-DDTHH:mm`; API remains ISO for Asia/Bangkok.
- Backend, database, and shared API types do not change.
- All three native `datetime-local` inputs must be removed.
- Preserve an unchanged edit timestamp byte-for-byte.
- Preserve Untitled UI's MIT attribution.

---

### Task 1: Buddhist date-time helpers

**Files:**
- Modify: `apps/frontend/src/lib/date-time.ts`
- Test: `apps/frontend/src/lib/date-time.spec.ts`

**Interfaces:**
- Produces: `formatDateTimeInputValue(value: string): string`
- Produces: `parseDateTimeInputValue(value: string): string`
- Produces: `maskDateTimeInputValue(value: string): string`
- Produces: `isLocalDateTimeInRange(value: string, minValue?: string, maxValue?: string): boolean`

- [ ] **Step 1: Write failing helper tests**

Add literal assertions covering:

```ts
expect(formatDateTimeInputValue("2026-08-14T17:30")).toBe("14/08/2569 17:30");
expect(parseDateTimeInputValue("14/08/2569 17:30")).toBe("2026-08-14T17:30");
expect(maskDateTimeInputValue("140825691730")).toBe("14/08/2569 17:30");
expect(() => parseDateTimeInputValue("29/02/2568 10:00")).toThrow();
expect(isLocalDateTimeInRange("2026-08-14T17:30", undefined, "2026-08-14T17:29")).toBe(false);
```

- [ ] **Step 2: Verify RED**

Run `TZ=UTC pnpm --filter frontend test:run src/lib/date-time.spec.ts`; expect missing exports/failing assertions.

- [ ] **Step 3: Implement strict helpers**

Use fixed-width regexes, Buddhist year minus `543`, UTC field round-tripping for real-date validation, and digit truncation to 12 characters for the mask. Reuse the existing Bangkok parser for normalized comparisons.

- [ ] **Step 4: Verify GREEN**

Run the same focused test; expect all date-time utility tests to pass.

- [ ] **Step 5: Commit**

Commit `test` and helper changes as `feat(frontend): add Buddhist date input helpers`.

### Task 2: Shared Untitled UI date-time picker

**Files:**
- Create: `apps/frontend/src/components/ui/date-time-picker.tsx`
- Create: `apps/frontend/src/components/ui/date-time-picker.spec.tsx`
- Modify: `apps/frontend/src/app/globals.css`
- Modify: `apps/frontend/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `docs/third-party/untitled-ui-MIT.txt`

**Interfaces:**
- Consumes: the four Task 1 helpers and existing `Button`
- Produces:

```ts
interface DateTimePickerFieldProps {
  disabled?: boolean;
  error?: string;
  label: string;
  maxValue?: string;
  minValue?: string;
  name: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  value: string;
}
```

- [ ] **Step 1: Add dependencies and attribution**

Run `pnpm --filter frontend add @internationalized/date react-aria-components`. Add the unmodified Untitled UI MIT license text and source attribution for the adapted date picker.

- [ ] **Step 2: Write failing component tests**

Test real rendered behavior: initial `14/08/2569 17:30`, manual masked entry emits `2026-08-14T17:30`, incomplete entry emits `""`, invalid/out-of-range values expose an error state, calendar/date and hour/minute remain draft until `นำไปใช้`, `ยกเลิก` discards them, and focus returns after Escape.

- [ ] **Step 3: Verify RED**

Run `TZ=UTC pnpm --filter frontend test:run src/components/ui/date-time-picker.spec.tsx`; expect module-not-found failure.

- [ ] **Step 4: Implement the component**

Compose `DatePicker`, `Group`, `Popover`, `Dialog`, `Calendar`, `CalendarGrid`, `CalendarCell`, and `I18nProvider` from React Aria. Parse normalized values into Gregorian `CalendarDateTime`; display via `th-TH-u-ca-buddhist-nu-latn`; keep popover draft separate; expose numeric hour/minute fields; disable precise invalid apply; use Lucide calendar/clock/chevron icons.

- [ ] **Step 5: Add responsive styles**

Style the input, icon trigger, popover, calendar grid/cells, selected/today/disabled/focus states, time row, and actions using existing CSS variables. Set portal z-index above `.modal-backdrop` and constrain width to the mobile viewport.

- [ ] **Step 6: Verify GREEN and accessibility behavior**

Run the focused component tests and `pnpm --filter frontend typecheck`; expect pass with no React warnings.

- [ ] **Step 7: Commit**

Commit component, tests, dependencies, styles, and attribution as `feat(frontend): add Untitled UI date time picker`.

### Task 3: Modal integration and nested overlay behavior

**Files:**
- Modify: `apps/frontend/src/components/ui/modal.tsx`
- Modify: `apps/frontend/src/components/ui/modal.spec.tsx`
- Modify: `apps/frontend/src/features/violations/create-violation-modal.tsx`
- Modify: `apps/frontend/src/features/violations/edit-violation-modal.tsx`
- Modify: `apps/frontend/src/features/payments/mark-fine-paid-modal.tsx`
- Test: corresponding modal spec files and `house-detail-page.spec.tsx`

**Interfaces:**
- Consumes: `DateTimePickerField`, React Hook Form `Controller`, `toDateTimeLocalValue`
- Keeps: existing form schemas and API inputs unchanged

- [ ] **Step 1: Write failing nested overlay and integration tests**

Assert Escape from an element outside the modal panel does not call modal `onClose`. Update each form test to type `01/07/2569 10:00`, assert normalized ISO payloads, reject future/payment-before-violation values, and preserve the exact original edit timestamp when date-time stays unchanged.

- [ ] **Step 2: Verify RED**

Run the five affected spec files under `TZ=UTC`; expect native-input assumptions and modal Escape behavior to fail.

- [ ] **Step 3: Fix modal keyboard scope**

Before handling Escape or Tab, return when the keyboard event target is not contained by `panelRef.current`. Keep existing focus restoration and pending behavior.

- [ ] **Step 4: Replace native inputs**

Use `Controller` for `occurredAt`/`paidAt`, pass schema errors, current-minute `maxValue`, payment `minValue`, and field ref. Preserve `input[name=...]` so existing initial-focus selectors continue to work.

- [ ] **Step 5: Verify GREEN**

Run the affected specs, then all frontend tests under `TZ=UTC`; expect all pass and no `datetime-local` occurrences in production files.

- [ ] **Step 6: Commit**

Commit modal behavior and all integrations as `feat(frontend): use date time picker across forms`.

### Task 4: Full verification

**Files:**
- Modify only if a failing verification gets a regression test first.

**Interfaces:**
- Verifies all preceding tasks as one release candidate.

- [ ] **Step 1: Run complete checks**

Run:

```bash
TZ=UTC pnpm test
pnpm --recursive typecheck
pnpm lint
pnpm build
```

- [ ] **Step 2: Inspect final diff**

Confirm no backend/schema changes, no production `datetime-local`, no unrelated files, preserved attribution, and all user-visible date-time strings use `DD/MM/BBBB HH:mm`.

- [ ] **Step 3: Commit verification fixes if needed**

For each issue, first add a failing regression test, then fix, rerun its focused test, and commit with a scoped English message.
