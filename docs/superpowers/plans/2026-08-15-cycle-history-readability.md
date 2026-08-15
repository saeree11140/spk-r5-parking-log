# Cycle History Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Increase the Cycle History date, totals, and table typography while leaving every other table unchanged.

**Architecture:** Add a semantic class to the Cycle History table and scope all new table typography to that class. Adjust existing cycle metadata and totals selectors in the shared stylesheet; preserve the current overflow behavior.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library.

---

### Task 1: Scope and enlarge Cycle History content

**Files:**
- Modify: `apps/frontend/src/features/houses/house-detail-page.spec.tsx`
- Modify: `apps/frontend/src/features/houses/cycle-history.tsx`
- Modify: `apps/frontend/src/app/globals.css`

- [ ] **Step 1: Write a failing scope test**

In the existing Cycle History rendering test, assert the table inside `Cycle 2` has class `cycle-table`.

- [ ] **Step 2: Run the focused test and verify RED**

```bash
TZ=UTC pnpm --filter frontend exec vitest run src/features/houses/house-detail-page.spec.tsx
```

Expected: FAIL because the table has no cycle-specific class.

- [ ] **Step 3: Add the scope class and typography**

- Add `className="cycle-table"` to the Cycle History table.
- Set `.cycle-header p` to `15px`.
- Increase `.cycle-totals` vertical padding and gap modestly.
- Set `.cycle-totals dt` to `14px` and `.cycle-totals dd` to `20px`.
- Set `.cycle-table th` to `14px` and `.cycle-table td` to `16px` with comfortable vertical padding.
- Do not change global `th` or `td` sizes.

- [ ] **Step 4: Run focused verification and verify GREEN**

```bash
TZ=UTC pnpm --filter frontend exec vitest run src/features/houses/house-detail-page.spec.tsx
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend build
```

Expected: all commands exit 0.

- [ ] **Step 5: Review and commit**

Run `git diff --check`, review the scoped diff, and commit the implementation.
