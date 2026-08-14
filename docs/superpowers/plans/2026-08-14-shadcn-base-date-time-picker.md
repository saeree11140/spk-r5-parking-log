# shadcn Base Date Time Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken Untitled UI/React Aria date-time picker with a shadcn Base UI picker whose Apply and Cancel actions stay reachable and clickable.

**Architecture:** Keep `DateTimePickerField` and every form contract stable. Replace its overlay and calendar internals with shadcn-style `Popover` wrappers over Base UI and a `Calendar` wrapper over React DayPicker; keep masked Buddhist input, draft Apply/Cancel semantics, Bangkok conversion, and precise bounds in the existing shared component.

**Tech Stack:** React 19, Next.js 16, TypeScript, React Hook Form, `@base-ui/react`, `react-day-picker`, `date-fns`, Lucide React, Vitest, Testing Library, CSS.

## Global Constraints

- Keep display/manual input as `DD/MM/BBBB HH:mm` with Buddhist year and Latin digits.
- Keep normalized form values as Gregorian `YYYY-MM-DDTHH:mm` and API payloads as Bangkok-derived ISO timestamps.
- Keep the existing `DateTimePickerField` public props and forwarded input ref.
- Keep draft selection until `นำไปใช้`; discard it on `ยกเลิก`, outside interaction, or `Escape`.
- Keep future-date and payment lower-bound validation, including ceiling a violation timestamp with seconds or milliseconds to the next minute.
- Keep exact original seconds/milliseconds when editing only a note.
- Remove all Untitled UI and React Aria implementation dependencies, attribution, and superseded design documents.

---

### Task 1: Add shadcn Base UI primitives

**Files:**
- Create: `apps/frontend/src/components/ui/popover.tsx`
- Create: `apps/frontend/src/components/ui/calendar.tsx`
- Modify: `apps/frontend/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `Popover`, `PopoverTrigger`, `PopoverContent` backed by `@base-ui/react/popover`.
- Produces: `Calendar(props: React.ComponentProps<typeof DayPicker>)` backed by `react-day-picker`.
- Consumes: existing `Button`, Lucide `ChevronLeft`/`ChevronRight`, and project CSS classes.

- [ ] **Step 1: Install the replacement dependencies**

Run:

```bash
pnpm --filter frontend add @base-ui/react react-day-picker
pnpm --filter frontend remove react-aria-components @internationalized/date
```

Expected: frontend dependencies contain Base UI and React DayPicker; React Aria packages disappear from the frontend importer graph and lockfile when no longer transitive.

- [ ] **Step 2: Add the shadcn Base Popover wrapper**

Adapt the official Base registry composition into `popover.tsx`. Preserve the Base UI portal and collision-aware positioner:

```tsx
"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

export function Popover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root {...props} />;
}

export function PopoverTrigger(props: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger {...props} />;
}

export function PopoverContent({
  align = "end",
  side = "bottom",
  sideOffset = 8,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "side" | "sideOffset"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        className="date-time-picker__positioner"
        side={side}
        sideOffset={sideOffset}
      >
        <PopoverPrimitive.Popup {...props} />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}
```

- [ ] **Step 3: Add the shadcn Calendar wrapper**

Adapt the official Base registry `Calendar` around `DayPicker`. Use existing `Button`/Lucide icons, pass through `locale`, `formatters`, `disabled`, `selected`, `month`, `onMonthChange`, and `onSelect`, and provide stable project class names for root, month caption, navigation, weekdays, weeks, days, selected, outside, disabled, today, and focus state.

- [ ] **Step 4: Run static checks for the primitives**

Run:

```bash
pnpm --filter frontend typecheck
pnpm --filter frontend lint
```

Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/package.json pnpm-lock.yaml apps/frontend/src/components/ui/popover.tsx apps/frontend/src/components/ui/calendar.tsx
git commit -m "feat(frontend): add shadcn Base date picker primitives"
```

---

### Task 2: Rewrite the shared date-time picker with TDD

**Files:**
- Modify: `apps/frontend/src/components/ui/date-time-picker.spec.tsx`
- Modify: `apps/frontend/src/components/ui/date-time-picker.tsx`
- Modify: `apps/frontend/src/app/globals.css`

**Interfaces:**
- Consumes: `Calendar`, `Popover`, `PopoverTrigger`, `PopoverContent`, and existing helpers in `@/lib/date-time`.
- Produces: unchanged `DateTimePickerField` controlled interface and forwarded `HTMLInputElement` ref.

- [ ] **Step 1: Write failing user-visible interaction tests**

Add tests that exercise the real shared component:

```tsx
it("commits a calendar date only after Apply and closes the popover", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  renderWithQueryClient(<PickerHarness onChangeSpy={onChange} />);

  await user.click(screen.getByRole("button", { name: /เปิดปฏิทิน/ }));
  await user.click(screen.getByRole("button", { name: /15 สิงหาคม 2569/ }));

  expect(onChange).not.toHaveBeenLastCalledWith("2026-08-15T17:30");
  await user.click(screen.getByRole("button", { name: "นำไปใช้" }));

  expect(onChange).toHaveBeenLastCalledWith("2026-08-15T17:30");
  expect(screen.queryByRole("dialog", { name: "เลือกวันเวลา" })).not.toBeInTheDocument();
});

it("discards the draft on outside interaction and restores input focus", async () => {
  const user = userEvent.setup();
  renderWithQueryClient(<PickerHarness />);
  const input = screen.getByLabelText("วันเวลาเกิดเหตุ");

  await user.click(screen.getByRole("button", { name: /เปิดปฏิทิน/ }));
  await user.click(document.body);

  expect(screen.queryByRole("dialog", { name: "เลือกวันเวลา" })).not.toBeInTheDocument();
  expect(input).toHaveFocus();
  expect(input).toHaveValue("14/08/2569 17:30");
});
```

Retain and adjust the existing tests for manual mask, incomplete values, range errors, time draft, Cancel, Escape, ARIA label, and focus return.

Add a migration regression assertion proving the shared component no longer injects React Aria's hidden native control:

```tsx
expect(document.querySelector('input[type="datetime-local"]')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the focused suite and verify RED**

Run:

```bash
TZ=UTC pnpm --filter frontend test --run src/components/ui/date-time-picker.spec.tsx
```

Expected: the migration regression fails because the current React Aria component injects a hidden `input[type="datetime-local"]`. Other failures must reflect intended shadcn interaction changes, not test typos.

- [ ] **Step 3: Replace React Aria internals**

Rewrite `date-time-picker.tsx` to:

- Store the calendar draft as a Gregorian `Date` created with UTC-safe numeric construction.
- Convert the selected day back to normalized `YYYY-MM-DDTHH:mm` without host-timezone dependence.
- Render the main masked text input and shadcn `PopoverTrigger` as siblings in the same input group.
- Render `Calendar mode="single"`, Thai `locale`, custom Buddhist caption and accessible day labels, disabled days outside date-level min/max, Today, hour/minute controls, draft error, Cancel, and Apply.
- Control `open` explicitly. On close without Apply, reinitialize draft next time and queue focus restoration to the main input.
- Keep manual entry and precise `isLocalDateTimeInRange` validation unchanged.

Use pure local conversion helpers such as:

```ts
function dateFromNormalized(value?: string): Date | undefined;
function normalizedFromDate(date: Date, hour: string, minute: string): string | undefined;
function buddhistDayLabel(date: Date): string;
```

- [ ] **Step 4: Make the popup viewport-safe**

Replace React Aria selectors with Base UI/DayPicker classes. Keep the popup within the available viewport:

```css
.date-time-picker__positioner {
  z-index: 200;
  max-width: calc(100vw - 32px);
}

.date-time-picker__popover {
  display: grid;
  width: min(344px, calc(100vw - 32px));
  max-height: min(620px, calc(100vh - 32px));
  overflow: hidden;
}

.date-time-picker__scroll {
  min-height: 0;
  overflow-y: auto;
}

.date-time-picker__actions {
  position: sticky;
  bottom: 0;
  background: var(--surface);
}
```

Keep action buttons outside `.date-time-picker__scroll` so they never scroll below the viewport.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
TZ=UTC pnpm --filter frontend test --run src/components/ui/date-time-picker.spec.tsx src/components/ui/modal.spec.tsx
```

Expected: all focused tests pass with no unhandled errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/components/ui/date-time-picker.tsx apps/frontend/src/components/ui/date-time-picker.spec.tsx apps/frontend/src/app/globals.css
git commit -m "fix(frontend): replace date picker with shadcn Base UI"
```

---

### Task 3: Verify all workflows and remove Untitled UI artifacts

**Files:**
- Modify: `apps/frontend/src/features/violations/create-violation-modal.spec.tsx`
- Modify: `apps/frontend/src/features/violations/edit-violation-modal.spec.tsx`
- Modify: `apps/frontend/src/features/payments/mark-fine-paid-modal.spec.tsx`
- Delete: `docs/third-party/untitled-ui-MIT.txt`
- Delete: `docs/superpowers/specs/2026-08-14-untitled-ui-date-time-picker-design.md`
- Delete: `docs/superpowers/plans/2026-08-14-untitled-ui-date-time-picker.md`

**Interfaces:**
- Consumes: unchanged `DateTimePickerField` API in all three React Hook Form controllers.
- Verifies: normalized values and API payload contracts remain unchanged.

- [ ] **Step 1: Add or retain integration assertions for all three workflows**

Ensure tests prove:

- Create submits a manually entered Buddhist date as the correct Bangkok ISO timestamp.
- Edit initializes from the API timestamp and preserves exact seconds/milliseconds when only the note changes.
- Payment blocks a minute before its rounded lower bound and submits the first valid minute.
- Each modal can open the picker and activate `นำไปใช้` without closing the parent modal.

- [ ] **Step 2: Run integration tests**

Run:

```bash
TZ=UTC pnpm --filter frontend test --run \
  src/features/violations/create-violation-modal.spec.tsx \
  src/features/violations/edit-violation-modal.spec.tsx \
  src/features/payments/mark-fine-paid-modal.spec.tsx
```

Expected: all pass.

- [ ] **Step 3: Remove superseded Untitled UI artifacts**

Delete the attribution, old Untitled design, and old Untitled implementation plan. Confirm production and documentation no longer reference the removed implementation:

```bash
rg -n "Untitled UI|react-aria-components|@internationalized/date" apps/frontend docs pnpm-lock.yaml
```

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/features docs pnpm-lock.yaml apps/frontend/package.json
git commit -m "test(frontend): cover shadcn date picker workflows"
```

---

### Task 4: Browser and full-workspace verification

**Files:**
- Modify only if verification exposes a defect in the approved scope.

**Interfaces:**
- Verifies the final user-visible behavior and repository health.

- [ ] **Step 1: Reproduce the original viewport scenario in a real browser**

Start frontend/backend, open an edit-violation modal at the screenshot-sized viewport, open the picker, choose a day/time, and click `นำไปใช้`.

Expected:

- Popover stays inside the viewport or scrolls internally.
- `ยกเลิก` and `นำไปใช้` stay visible.
- `นำไปใช้` updates the field and closes only the popover.
- First `Escape` closes the popover; second `Escape` closes the modal.

- [ ] **Step 2: Run fresh full verification**

Run:

```bash
TZ=UTC pnpm test && \
pnpm --filter backend test:e2e --runInBand && \
pnpm --recursive typecheck && \
pnpm lint && \
pnpm build
```

Expected: every command exits 0.

- [ ] **Step 3: Check final scope and status**

Run:

```bash
rg -n 'type="datetime-local"|Untitled UI|react-aria-components|@internationalized/date' apps/frontend/src docs pnpm-lock.yaml
git diff --check
git status --short
```

Expected: no removed implementation references, no whitespace errors, and a clean worktree after commits.
