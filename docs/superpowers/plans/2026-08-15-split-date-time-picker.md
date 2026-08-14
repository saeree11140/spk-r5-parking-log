# Split Date and Time Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the combined Buddhist date-time text input with a shadcn-style date button and native 24-hour time input across all three date-time forms.

**Architecture:** Keep `DateTimePickerField` as the single controlled React Hook Form boundary. Internally split the value into a UTC-backed calendar date and `HH:mm` string, recombine to `YYYY-MM-DDTHH:mm` after each interaction, and retain local parts while an invalid value is represented to the form as an empty string.

**Tech Stack:** React 19, TypeScript, Base UI Popover, `react-day-picker`, `date-fns`, React Hook Form, Vitest, Testing Library.

## Global Constraints

- Apply the shared picker to create violation, edit violation, and mark fine paid forms.
- Display dates as `DD/MM/BBBB`, with Buddhist year and Arabic digits.
- Use native `input[type="time"]` with 24-hour `HH:mm` precision.
- Selecting a date commits immediately and closes the popover; there are no Apply or Cancel actions.
- Preserve `minValue`, `maxValue`, Asia/Bangkok API conversion, and unchanged edit timestamps.
- Do not add another date-picker dependency or change backend, database, shared API types, or table formatting.

---

### Task 1: Split Date and Time Interaction

**Files:**
- Modify: `apps/frontend/src/components/ui/date-time-picker.spec.tsx`
- Modify: `apps/frontend/src/components/ui/date-time-picker.tsx`
- Modify: `apps/frontend/src/app/globals.css`

**Interfaces:**
- Consumes: existing `DateTimePickerFieldProps` and `Calendar`/`Popover` primitives.
- Produces: unchanged `DateTimePickerField`, emitting `YYYY-MM-DDTHH:mm` through `onChange`.

- [ ] **Step 1: Replace draft/Apply tests with failing split-control tests**

Add tests that assert the initial date button and time input, immediate date commit, immediate time commit, and absence of the old actions:

```tsx
expect(screen.getByRole("button", { name: "เลือกวันที่ วันเวลาเกิดเหตุ" }))
  .toHaveTextContent("14/08/2569");
expect(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ")).toHaveValue("17:30");

await user.click(screen.getByRole("button", { name: "เลือกวันที่ วันเวลาเกิดเหตุ" }));
await user.click(screen.getByRole("button", { name: /15 สิงหาคม 2569/ }));
expect(onChange).toHaveBeenLastCalledWith("2026-08-15T17:30");
expect(screen.queryByRole("dialog", { name: "เลือกวันที่" })).not.toBeInTheDocument();

fireEvent.change(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ"), {
  target: { value: "18:45" },
});
expect(onChange).toHaveBeenLastCalledWith("2026-08-14T18:45");
expect(screen.queryByRole("button", { name: "นำไปใช้" })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
TZ=UTC pnpm --filter frontend test:run -- src/components/ui/date-time-picker.spec.tsx
```

Expected: FAIL because the current component exposes one combined text input and commits calendar changes only after `นำไปใช้`.

- [ ] **Step 3: Implement the split controlled component**

In `date-time-picker.tsx`:

- replace `CalendarDays`/`Clock3` with `ChevronDownIcon`;
- remove display mask, draft hour/minute, calendar tools, Today button, and Apply/Cancel actions;
- keep strict normalized parsing and Buddhist calendar labels;
- add local `selectedDate` and `timeValue` state synchronized from external `value`;
- render a date `Button` inside `PopoverTrigger` and a named native time input;
- combine parts through one function and emit immediately;
- close the popover after `onSelect`.

Core render shape:

```tsx
<div className="date-time-picker form-field">
  <label htmlFor={dateInputId}>{label}</label>
  <div className="date-time-picker__controls">
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            ref={dateTriggerRef}
            aria-label={`เลือกวันที่ ${label}`}
            className="date-time-picker__date-trigger"
            disabled={disabled}
            id={dateInputId}
          >
            <span>{formatBuddhistDate(selectedDate)}</span>
            <ChevronDownIcon aria-hidden="true" size={16} />
          </Button>
        }
      />
      <PopoverContent aria-label="เลือกวันที่" className="date-time-picker__popover" role="dialog">
        <Calendar
          disabled={disabledDates}
          mode="single"
          month={visibleMonth}
          selected={selectedDate}
          onMonthChange={setVisibleMonth}
          onSelect={handleDateSelect}
        />
      </PopoverContent>
    </Popover>
    <input
      ref={forwardedRef}
      aria-label={`เวลา ${label}`}
      disabled={disabled}
      name={name}
      step="60"
      type="time"
      value={timeValue}
      onBlur={onBlur}
      onChange={(event) => handleTimeChange(event.target.value)}
    />
  </div>
</div>
```

Use an `emittedValueRef` guard so emitting `""` for an invalid local combination does not erase the user's selected local date/time when React Hook Form rerenders.

- [ ] **Step 4: Restyle the field as two shadcn-style controls**

Replace obsolete input-group, calendar-tools, draft-time, and action rules with:

```css
.date-time-picker__controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 128px;
  gap: 12px;
}

.date-time-picker__date-trigger {
  display: flex;
  min-height: 44px;
  justify-content: space-between;
  border: 1px solid var(--border);
  background: var(--surface);
}

@media (max-width: 420px) {
  .date-time-picker__controls {
    grid-template-columns: 1fr;
  }
}
```

Keep existing calendar, popover, selected-day, disabled-day, and animation rules.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
TZ=UTC pnpm --filter frontend test:run -- src/components/ui/date-time-picker.spec.tsx
```

Expected: all picker tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/components/ui/date-time-picker.tsx apps/frontend/src/components/ui/date-time-picker.spec.tsx apps/frontend/src/app/globals.css
git commit -m "refactor(frontend): split date and time picker controls"
```

### Task 2: Boundary Validation and Accessibility

**Files:**
- Modify: `apps/frontend/src/components/ui/date-time-picker.spec.tsx`
- Modify: `apps/frontend/src/components/ui/date-time-picker.tsx`
- Test: `apps/frontend/src/components/ui/modal.spec.tsx`

**Interfaces:**
- Consumes: split picker from Task 1 and `isLocalDateTimeInRange(value, minValue, maxValue)`.
- Produces: valid-or-empty controlled emissions with accessible errors and focus restoration.

- [ ] **Step 1: Add failing validation and accessibility tests**

Add tests for an invalid boundary time, empty time, disabled dates, Escape, focus restoration, and accessible names:

```tsx
fireEvent.change(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ"), {
  target: { value: "18:00" },
});
expect(onChange).toHaveBeenLastCalledWith("");
expect(screen.getByRole("alert")).toHaveTextContent("วันเวลาอยู่นอกช่วงที่กำหนด");

await user.click(screen.getByRole("button", { name: "เลือกวันที่ วันเวลาเกิดเหตุ" }));
await user.keyboard("{Escape}");
expect(screen.queryByRole("dialog", { name: "เลือกวันที่" })).not.toBeInTheDocument();
expect(screen.getByRole("button", { name: "เลือกวันที่ วันเวลาเกิดเหตุ" })).toHaveFocus();
```

Keep the modal regression asserting first Escape closes only the portaled picker and second Escape closes the parent modal.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
TZ=UTC pnpm --filter frontend test:run -- src/components/ui/date-time-picker.spec.tsx src/components/ui/modal.spec.tsx
```

Expected: FAIL until invalid split values emit empty and focus returns to the date trigger.

- [ ] **Step 3: Implement validation and focus behavior**

Use one commit helper:

```ts
function emitParts(nextDate: Date | undefined, nextTime: string) {
  const nextValue = nextDate ? normalizedFromDateAndTime(nextDate, nextTime) : undefined;
  if (!nextValue) {
    setLocalError("กรุณาระบุวันเวลาให้ครบ");
    emit("");
    return;
  }
  if (!isLocalDateTimeInRange(nextValue, minValue, maxValue)) {
    setLocalError("วันเวลาอยู่นอกช่วงที่กำหนด");
    emit("");
    return;
  }
  setLocalError(undefined);
  emit(nextValue);
}
```

Set `aria-invalid` and `aria-describedby` on both controls when an error is visible. Pass the date trigger ref as `finalFocus` to `PopoverContent`; keep modal popup detection unchanged.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
TZ=UTC pnpm --filter frontend test:run -- src/components/ui/date-time-picker.spec.tsx src/components/ui/modal.spec.tsx
```

Expected: all picker and modal tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/ui/date-time-picker.tsx apps/frontend/src/components/ui/date-time-picker.spec.tsx apps/frontend/src/components/ui/modal.spec.tsx
git commit -m "fix(frontend): validate split date time values"
```

### Task 3: Verify All Three Form Integrations

**Files:**
- Modify: `apps/frontend/src/features/violations/create-violation-modal.spec.tsx`
- Modify: `apps/frontend/src/features/violations/edit-violation-modal.spec.tsx`
- Modify: `apps/frontend/src/features/payments/mark-fine-paid-modal.spec.tsx`
- Verify unchanged: corresponding three modal implementation files.

**Interfaces:**
- Consumes: unchanged `DateTimePickerFieldProps` and existing React Hook Form `Controller` bindings.
- Produces: proof that all form payload and timestamp rules survive the UI change.

- [ ] **Step 1: Update integration interactions to use split controls**

Replace combined-input typing with direct date/time interactions. Preserve payload assertions:

```tsx
fireEvent.change(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ"), {
  target: { value: "18:45" },
});
await user.click(screen.getByRole("button", { name: "บันทึก Violation" }));
expect(parkingApi.createViolation).toHaveBeenCalledWith(
  expect.any(String),
  expect.objectContaining({ occurredAt: "2026-08-14T11:45:00.000Z" }),
);
```

For payment, assert a time before `minimumPaidAt` blocks mutation. For edit-note-only, submit without touching date/time and assert the original ISO string including seconds/milliseconds is retained.

- [ ] **Step 2: Run the three integration files**

Run:

```bash
TZ=UTC pnpm --filter frontend test:run -- src/features/violations/create-violation-modal.spec.tsx src/features/violations/edit-violation-modal.spec.tsx src/features/payments/mark-fine-paid-modal.spec.tsx
```

Expected: all integration tests PASS. If a test still searches for the old combined input, it fails until updated to the date button or time input accessible name.

- [ ] **Step 3: Commit integration updates**

```bash
git add apps/frontend/src/features/violations/create-violation-modal.spec.tsx apps/frontend/src/features/violations/edit-violation-modal.spec.tsx apps/frontend/src/features/payments/mark-fine-paid-modal.spec.tsx
git commit -m "test(frontend): cover split date time form integrations"
```

### Task 4: Full Verification

**Files:**
- Verify: entire workspace.

**Interfaces:**
- Consumes: completed component and integration behavior.
- Produces: release-ready verification evidence.

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

At a narrow modal viewport, verify:

- both controls fit without horizontal overflow;
- selecting a date closes only the picker and updates the Buddhist date;
- changing time updates the form;
- first Escape closes the picker, second Escape closes the modal;
- no console errors occur.

- [ ] **Step 3: Inspect final diff and worktree**

```bash
git diff develop~3 --check
git status --short
```

Expected: no whitespace errors and no uncommitted implementation files.
