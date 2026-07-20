# Frontend Admin MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้าง Admin UI ภาษาไทยแบบ Desktop-first สำหรับดูบ้าน 164 หลัง จัดการ Violation และบันทึก Fine ว่าชำระแล้วผ่าน Core Parking API

**Architecture:** Next.js App Router คง static export โดยสร้าง route บ้านครบ 164 หลังผ่าน `generateStaticParams`; Client Components ใช้ TanStack Query เป็น source of truth สำหรับ server state และ Axios client กลางสำหรับ HTTP. Zustand เก็บเฉพาะ Dashboard UI state, React Hook Form + Zod จัดการ form, date-fns จัดการวันเวลาผ่าน utility กลาง

**Tech Stack:** Next.js 16.2.10, React 19.2.4, TypeScript, Tailwind CSS 4, TanStack Query, Axios, Zustand, React Hook Form, Zod, date-fns, Lucide React, Vitest, React Testing Library

## Global Constraints

- UI ภาษาไทยเท่านั้น; Desktop-first และใช้งานบนมือถือได้
- คง `output: "export"`; `/houses/R5-001` ถึง `/houses/R5-164` ต้อง build เป็น static routes
- อ่าน guide ใน `apps/frontend/node_modules/next/dist/docs/` ที่เกี่ยวข้องก่อนแก้ Next.js code
- TanStack Query เก็บ API server state; ห้ามเก็บ House API data ใน Zustand
- Zustand เก็บเฉพาะ `searchQuery`, `houseFilter`, `sidebarCollapsed`; ไม่ persist
- Axios instance เดียว ใช้ `NEXT_PUBLIC_API_URL`, timeout 10 วินาที; component ห้ามเรียก Axios โดยตรง
- Refresh แบบ manual เท่านั้น: เปิดหน้า, หลัง mutation และปุ่ม Refresh; ห้าม polling
- วันเวลาทั้งหมดผ่าน date-fns utility กลาง; API รับ/ส่ง ISO 8601
- Lucide React เป็น icon library เดียว; ห้าม emoji; icon-only button ต้องมี `aria-label`
- การชำระเงินเป็นการเปลี่ยนสถานะเท่านั้น; ไม่มี online payment และไม่มี input จำนวนเงิน
- Frontend ใช้ Vitest + React Testing Library + `user-event`; พัฒนาแบบ TDD
- ใช้ Node.js 22.17.0 โดย prepend `export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"` ทุก command ที่เรียก Node/pnpm

---

## File Structure

### Contracts and test platform

- Modify `packages/shared-types/src/index.ts` — request/response/error types ของ Core Parking API
- Modify `apps/frontend/package.json` — runtime dependencies, Vitest dependencies และ test scripts
- Create `apps/frontend/vitest.config.mts` — jsdom, React plugin, tsconfig paths และ setup file
- Create `apps/frontend/src/test/setup.ts` — jest-dom cleanup และ browser polyfills
- Create `apps/frontend/src/test/render.tsx` — QueryClient test wrapper ที่ปิด retry
- Create `apps/frontend/src/test/fixtures.ts` — typed house/cycle/violation factories ใช้ร่วมกัน

### Shared frontend infrastructure

- Create `apps/frontend/src/lib/date-time.ts` และ `.spec.ts` — date-fns parse/format/validation
- Create `apps/frontend/src/lib/forms/schemas.ts` และ `.spec.ts` — Zod form schemas
- Create `apps/frontend/src/lib/api/api-error.ts` — normalized `ApiError`
- Create `apps/frontend/src/lib/api/client.ts` และ `.spec.ts` — Axios instance/interceptor
- Create `apps/frontend/src/lib/api/parking-api.ts` และ `.spec.ts` — typed API methods เท่านั้น
- Create `apps/frontend/src/lib/query/keys.ts` — query key factory
- Create `apps/frontend/src/stores/dashboard-store.ts` และ `.spec.ts` — Dashboard UI state
- Create `apps/frontend/src/features/dashboard/dashboard-selectors.ts` และ `.spec.ts` — KPI/search/filter functions

### Application and UI

- Modify `apps/frontend/src/app/layout.tsx` — Thai metadata, fonts, root providers
- Modify `apps/frontend/src/app/globals.css` — approved tokens, responsive layout, focus และ reduced motion
- Create `apps/frontend/src/app/providers.tsx` — stable QueryClient
- Create `apps/frontend/src/components/layout/app-shell.tsx` — sidebar/top navigation/content shell
- Create `apps/frontend/src/components/ui/button.tsx` — shared button/icon sizing
- Create `apps/frontend/src/components/ui/modal.tsx` — accessible dialog/focus/Escape/return focus
- Create `apps/frontend/src/components/ui/status-badge.tsx` — text + color statuses
- Create `apps/frontend/src/components/ui/feedback.tsx` — loading, empty, error, success notice

### Dashboard

- Modify `apps/frontend/src/app/page.tsx` — render Dashboard client feature
- Create `apps/frontend/src/features/dashboard/dashboard-page.tsx` และ `.spec.tsx` — query, states, refresh
- Create `apps/frontend/src/features/dashboard/dashboard-summary.tsx` — four KPI cards
- Create `apps/frontend/src/features/dashboard/house-filters.tsx` — search/filter controls
- Create `apps/frontend/src/features/dashboard/house-table.tsx` — sorted responsive table and detail links

### House detail and actions

- Create `apps/frontend/src/app/houses/[houseCode]/page.tsx` — 164 params and server wrapper
- Create `apps/frontend/src/features/houses/house-detail-page.tsx` และ `.spec.tsx` — query, summary/history/action state
- Create `apps/frontend/src/features/houses/house-summary.tsx` — current cycle figures
- Create `apps/frontend/src/features/houses/cycle-history.tsx` — cycle and violation tables
- Create `apps/frontend/src/features/violations/create-violation-modal.tsx` และ `.spec.tsx`
- Create `apps/frontend/src/features/violations/cancel-violation-modal.tsx` และ `.spec.tsx`
- Create `apps/frontend/src/features/payments/mark-fine-paid-modal.tsx` และ `.spec.tsx`
- Modify `apps/frontend/README.md` — environment, commands, routes และ manual test flow

---

### Task 1: API contracts and frontend test platform

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Modify: `apps/frontend/package.json`
- Create: `apps/frontend/vitest.config.mts`
- Create: `apps/frontend/src/test/setup.ts`
- Create: `apps/frontend/src/test/render.tsx`
- Create: `apps/frontend/src/test/fixtures.ts`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `CreateViolationInput`, `CancelViolationInput`, `MarkFinePaidInput`, `ViolationMutationResponse`, `MarkFinePaidResponse`, `ApiErrorResponse`
- Produces: `renderWithQueryClient(ui)`, `createTestQueryClient()`, typed fixture factories

- [ ] **Step 1: Install exact dependency set and add test scripts**

Run:

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm --filter frontend add @hookform/resolvers @tanstack/react-query axios date-fns lucide-react react-hook-form zod zustand
pnpm --filter frontend add -D @testing-library/dom @testing-library/jest-dom @testing-library/react @testing-library/user-event @vitejs/plugin-react jsdom vite-tsconfig-paths vitest
```

Then add scripts to `apps/frontend/package.json`:

```json
"test": "vitest",
"test:run": "vitest run",
"typecheck": "tsc --noEmit"
```

Expected: dependencies and `pnpm-lock.yaml` update; command exits 0.

- [ ] **Step 2: Add shared API contracts**

Append to `packages/shared-types/src/index.ts`:

```ts
export interface CreateViolationInput {
  occurredAt: string;
  note?: string;
}

export interface CancelViolationInput {
  reason: string;
}

export interface MarkFinePaidInput {
  paidAt: string;
  reference?: string;
}

export interface ViolationMutationResponse {
  violation: ViolationResponse;
  currentCycle: CycleSummary;
}

export interface MarkFinePaidResponse {
  fine: FineResponse;
  violation: ViolationResponse;
  cycleClosed: boolean;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
}
```

- [ ] **Step 3: Create Vitest setup and prove runner works**

Create `vitest.config.mts` with `environment: "jsdom"`, React plugin, `vite-tsconfig-paths`, setup file, CSS enabled, globals false. Create `setup.ts` importing `@testing-library/jest-dom/vitest`, calling RTL `cleanup` in `afterEach`, and polyfilling `window.matchMedia`. Create `render.tsx` exporting a QueryClient configured with `{ queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } }` and a wrapper using `QueryClientProvider`.

Create `fixtures.ts` exporting:

```ts
export function makeHouseSummary(overrides: Partial<HouseSummary> = {}): HouseSummary
export function makeViolation(overrides: Partial<ViolationResponse> = {}): ViolationResponse
export function makeCycle(overrides: Partial<CycleResponse> = {}): CycleResponse
export function makeHouseDetail(overrides: Partial<HouseDetail> = {}): HouseDetail
```

Factories must use deterministic IDs/timestamps and merge `overrides` last.

Add `src/test/smoke.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeHouseSummary } from "./fixtures";

describe("frontend test setup", () => {
  it("creates typed house fixtures", () => {
    expect(makeHouseSummary({ code: "R5-164" }).code).toBe("R5-164");
  });
});
```

Run:

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm --filter frontend test:run src/test/smoke.spec.ts
```

Expected: `1 passed`.

- [ ] **Step 4: Verify types and commit**

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm --filter frontend typecheck
git add packages/shared-types/src/index.ts apps/frontend/package.json apps/frontend/vitest.config.mts apps/frontend/src/test pnpm-lock.yaml
git commit -m "test: configure frontend Vitest platform"
```

Expected: typecheck exits 0; commit succeeds.

### Task 2: Date utilities and validated form schemas

**Files:**
- Create: `apps/frontend/src/lib/date-time.ts`
- Test: `apps/frontend/src/lib/date-time.spec.ts`
- Create: `apps/frontend/src/lib/forms/schemas.ts`
- Test: `apps/frontend/src/lib/forms/schemas.spec.ts`

**Interfaces:**
- Produces: `formatThaiDateTime(value)`, `toDateTimeLocalValue(value)`, `localDateTimeToIso(value)`, `isFutureDateTime(value, now)`, `isBeforeViolation(value, occurredAt)`
- Produces: `createViolationSchema(now)`, `cancelViolationSchema`, `markFinePaidSchema(occurredAt, now)` and inferred form value types

- [ ] **Step 1: Write failing date utility tests**

Cover exact cases:

```ts
expect(formatThaiDateTime("2026-07-01T03:00:00.000Z")).toBe("01/07/2569 10:00");
expect(toDateTimeLocalValue("2026-07-01T03:00:00.000Z")).toMatch(/^2026-07-01T10:00$/);
expect(localDateTimeToIso("2026-07-01T10:00")).toBe("2026-07-01T03:00:00.000Z");
expect(isFutureDateTime("2026-07-20T10:01", new Date("2026-07-20T03:00:00.000Z"))).toBe(true);
expect(isBeforeViolation("2026-07-01T09:59", "2026-07-01T03:00:00.000Z")).toBe(true);
```

Set `process.env.TZ = "Asia/Bangkok"` for this test file.

Run: `pnpm --filter frontend test:run src/lib/date-time.spec.ts`

Expected: FAIL because module does not exist.

- [ ] **Step 2: Implement date utility using date-fns only**

Use `parseISO`, `parse`, `format`, `isAfter`, `isBefore`, `isValid` and `th` locale. Invalid input must return `"—"` for display and throw `Error("Invalid local date time")` for submission conversion. Format uses Buddhist year by adding 543 before rendering; never let components call date-fns directly.

Run same test. Expected: all date tests PASS.

- [ ] **Step 3: Write failing schema tests**

Test:

- Create rejects missing/future `occurredAt`, trims `note`, rejects 1001 characters.
- Cancel trims `reason`, rejects 4 and 501 characters.
- Mark paid rejects future time and time before violation; trims `reference`; rejects 129 characters.
- Empty optional text becomes `undefined`, not empty string.

Run: `pnpm --filter frontend test:run src/lib/forms/schemas.spec.ts`

Expected: FAIL because schemas do not exist.

- [ ] **Step 4: Implement schema factories**

Export exact types:

```ts
export type CreateViolationFormValues = z.infer<ReturnType<typeof createViolationSchema>>;
export type CancelViolationFormValues = z.infer<typeof cancelViolationSchema>;
export type MarkFinePaidFormValues = z.infer<ReturnType<typeof markFinePaidSchema>>;
```

Use Thai messages: `กรุณาระบุวันเวลา`, `วันเวลาต้องไม่อยู่ในอนาคต`, `หมายเหตุต้องไม่เกิน 1,000 ตัวอักษร`, `เหตุผลต้องมี 5–500 ตัวอักษร`, `เวลาชำระต้องไม่ก่อนเวลาเกิดเหตุ`, `เลขอ้างอิงต้องไม่เกิน 128 ตัวอักษร`.

Run:

```bash
pnpm --filter frontend test:run src/lib/date-time.spec.ts src/lib/forms/schemas.spec.ts
git add apps/frontend/src/lib/date-time* apps/frontend/src/lib/forms
git commit -m "feat: add frontend date and form validation"
```

Expected: both suites PASS; commit succeeds.

### Task 3: Typed Axios API and dashboard client state

**Files:**
- Create: `apps/frontend/src/lib/api/api-error.ts`
- Create: `apps/frontend/src/lib/api/client.ts`
- Test: `apps/frontend/src/lib/api/client.spec.ts`
- Create: `apps/frontend/src/lib/api/parking-api.ts`
- Test: `apps/frontend/src/lib/api/parking-api.spec.ts`
- Create: `apps/frontend/src/lib/query/keys.ts`
- Create: `apps/frontend/src/stores/dashboard-store.ts`
- Test: `apps/frontend/src/stores/dashboard-store.spec.ts`
- Create: `apps/frontend/src/features/dashboard/dashboard-selectors.ts`
- Test: `apps/frontend/src/features/dashboard/dashboard-selectors.spec.ts`

**Interfaces:**
- Produces: `apiClient`, `ApiError`, `parkingApi`, `queryKeys`
- Produces: `useDashboardStore`, `getDashboardMetrics(houses)`, `filterHouses(houses, search, filter)`

- [ ] **Step 1: Write failing Axios client tests**

Mock Axios adapter and verify:

```ts
expect(apiClient.defaults.baseURL).toBe("http://localhost:3001/api");
expect(apiClient.defaults.timeout).toBe(10_000);
await expect(rejectedDomainRequest).rejects.toMatchObject({ code: "HOUSE_NOT_FOUND", statusCode: 404 });
await expect(rejectedTimeout).rejects.toMatchObject({ code: "TIMEOUT", message: "การเชื่อมต่อใช้เวลานานเกินไป" });
await expect(rejectedNetwork).rejects.toMatchObject({ code: "NETWORK_ERROR", message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
```

Run: `pnpm --filter frontend test:run src/lib/api/client.spec.ts`

Expected: FAIL because client does not exist.

- [ ] **Step 2: Implement normalized API errors and Axios singleton**

`ApiError` extends `Error` and exposes readonly `statusCode: number | null`, `code: string`. Interceptor accepts `{ statusCode, code, message }` only when all fields have correct primitive types; otherwise return safe Thai timeout/network/unknown errors without raw response details.

Run same suite. Expected: PASS.

- [ ] **Step 3: Write failing parking API tests, then implement five methods**

Verify exact requests:

```ts
GET  /houses
GET  /houses/R5-001
POST /houses/R5-001/violations
POST /houses/R5-001/violations/{violationId}/cancel
POST /houses/R5-001/violations/{violationId}/mark-paid
```

Export:

```ts
export const parkingApi = {
  getHouses(): Promise<HouseSummary[]>;
  getHouse(houseCode: string): Promise<HouseDetail>;
  createViolation(houseCode: string, input: CreateViolationInput): Promise<ViolationMutationResponse>;
  cancelViolation(houseCode: string, violationId: string, input: CancelViolationInput): Promise<ViolationMutationResponse>;
  markFinePaid(houseCode: string, violationId: string, input: MarkFinePaidInput): Promise<MarkFinePaidResponse>;
};
```

Return `response.data`; encode path segments with `encodeURIComponent`.

Run: `pnpm --filter frontend test:run src/lib/api`

Expected: client and API tests PASS.

- [ ] **Step 4: Test and implement query keys, Zustand store and pure selectors**

Use:

```ts
export const queryKeys = {
  houses: ["houses"] as const,
  house: (houseCode: string) => ["house", houseCode] as const,
};

export type HouseFilter = "ALL" | "ACTIVE_VIOLATIONS" | "PENDING_FINE" | "NO_CURRENT_ACTIVITY" | "INACTIVE";
```

Store defaults: empty search, `ALL`, sidebar expanded. Actions: `setSearchQuery`, `setHouseFilter`, `toggleSidebar`, `resetDashboard`. Selector tests must cover 164 total, active cycle violations, pending fine count/sum, code/actual-number case-insensitive search, every filter, and final sort by `sequenceNumber`.

Run:

```bash
pnpm --filter frontend test:run src/stores src/features/dashboard/dashboard-selectors.spec.ts
pnpm --filter frontend typecheck
git add apps/frontend/src/lib/api apps/frontend/src/lib/query apps/frontend/src/stores apps/frontend/src/features/dashboard/dashboard-selectors*
git commit -m "feat: add typed frontend data layer"
```

Expected: suites and typecheck PASS; commit succeeds.

### Task 4: Providers, design tokens and accessible application shell

**Files:**
- Modify: `apps/frontend/src/app/layout.tsx`
- Modify: `apps/frontend/src/app/globals.css`
- Create: `apps/frontend/src/app/providers.tsx`
- Create: `apps/frontend/src/components/layout/app-shell.tsx`
- Create: `apps/frontend/src/components/ui/button.tsx`
- Create: `apps/frontend/src/components/ui/modal.tsx`
- Test: `apps/frontend/src/components/ui/modal.spec.tsx`
- Create: `apps/frontend/src/components/ui/status-badge.tsx`
- Create: `apps/frontend/src/components/ui/feedback.tsx`

**Interfaces:**
- Consumes: `useDashboardStore`
- Produces: reusable `AppShell`, `Button`, `Modal`, `StatusBadge`, `LoadingState`, `EmptyState`, `ErrorState`, `SuccessNotice`

- [ ] **Step 1: Read required Next.js guides immediately before code**

Read completely:

```bash
sed -n '1,360p' apps/frontend/node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md
sed -n '1,360p' apps/frontend/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
```

Expected: confirm `next/font` self-hosts font assets and provider is a focused Client Component.

- [ ] **Step 2: Write failing Modal accessibility test**

Test open dialog has `role="dialog"`, `aria-modal="true"`, labelled title, initial focus inside; Escape calls `onClose`; closing restores focus to trigger. Verify pending state can disable close and submit.

Run: `pnpm --filter frontend test:run src/components/ui/modal.spec.tsx`

Expected: FAIL because Modal does not exist.

- [ ] **Step 3: Implement providers and UI primitives**

`Providers` must create one QueryClient using lazy `useState`, with no polling and retry limited to one query attempt except 4xx. `Modal` uses native `<dialog>` or equivalent focus trap, closes on Escape/backdrop only when not pending, and returns focus. `Button` supports `primary | secondary | danger | ghost`, Lucide icons and 44px mobile minimum target. Feedback components use Thai copy and retry button.

Run Modal test. Expected: PASS.

- [ ] **Step 4: Implement approved visual shell and root layout**

Use `Noto_Sans_Thai` and `Chakra_Petch` from `next/font/google`, expose CSS variables, set `<html lang="th">`, metadata title `SPK R5 Parking Log | ระบบจัดการการจอดรถ`, and wrap children with `Providers` then `AppShell`.

Define exact color variables:

```css
:root {
  --canvas: #f4f6f8;
  --surface: #ffffff;
  --ink: #17212b;
  --muted: #667085;
  --border: #d0d5dd;
  --road-blue: #175cd3;
  --warning: #d97706;
  --danger: #b42318;
  --success: #067647;
}
```

Sidebar labels: `ภาพรวม`, `รายชื่อบ้าน`; mobile uses top navigation control. Add visible `:focus-visible`, horizontal table overflow, skeleton animation, modal transition, and disable transitions/animation under `prefers-reduced-motion: reduce`.

- [ ] **Step 5: Verify and commit**

```bash
pnpm --filter frontend test:run src/components/ui/modal.spec.tsx
pnpm --filter frontend lint
pnpm --filter frontend typecheck
git add apps/frontend/src/app apps/frontend/src/components
git commit -m "feat: add accessible frontend application shell"
```

Expected: tests, lint and typecheck PASS; commit succeeds.

### Task 5: Dashboard query, KPI, search and filters

**Files:**
- Modify: `apps/frontend/src/app/page.tsx`
- Create: `apps/frontend/src/features/dashboard/dashboard-page.tsx`
- Test: `apps/frontend/src/features/dashboard/dashboard-page.spec.tsx`
- Create: `apps/frontend/src/features/dashboard/dashboard-summary.tsx`
- Create: `apps/frontend/src/features/dashboard/house-filters.tsx`
- Create: `apps/frontend/src/features/dashboard/house-table.tsx`

**Interfaces:**
- Consumes: `parkingApi.getHouses`, `queryKeys.houses`, dashboard selectors/store, shared UI
- Produces: complete `/` dashboard

- [ ] **Step 1: Write failing Dashboard component tests**

Mock `parkingApi.getHouses` and render through QueryClient wrapper. Assert:

- Pending query renders four stable KPI skeletons and table skeleton.
- Network error shows `ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้` and `ลองใหม่`; clicking retries.
- Empty data shows `ยังไม่มีข้อมูลบ้าน`.
- Data renders four KPI labels, Thai currency via `Intl.NumberFormat("th-TH")`, sorted rows and `ดูรายละเอียด` links.
- Search `164` and filter `มี Fine รอชำระ` update visible rows through Zustand.
- Refresh button has accessible name `รีเฟรชข้อมูลบ้าน` and calls query `refetch`.

Run: `pnpm --filter frontend test:run src/features/dashboard/dashboard-page.spec.tsx`

Expected: FAIL because Dashboard components do not exist.

- [ ] **Step 2: Implement Dashboard page and presentation components**

`DashboardPage` is a Client Component using:

```ts
useQuery({ queryKey: queryKeys.houses, queryFn: parkingApi.getHouses, staleTime: 0, refetchOnWindowFocus: false });
```

KPI labels exactly: `บ้านทั้งหมด`, `บ้านที่มี Violation`, `Fine รอชำระ`, `ยอดรอชำระรวม`. Filter labels exactly match design spec. Table columns exactly: `รหัสบ้าน`, `เลขที่บ้าน`, `Violation ปัจจุบัน`, `Fine รอชำระ`, `ยอดค้าง`, `สถานะ`, `จัดการ`. House code gets road-sign class and Chakra Petch font. Link uses `/houses/${house.code}`.

Replace `app/page.tsx` with server wrapper returning `<DashboardPage />`.

- [ ] **Step 3: Run tests and commit**

```bash
pnpm --filter frontend test:run src/features/dashboard
pnpm --filter frontend lint
pnpm --filter frontend typecheck
git add apps/frontend/src/app/page.tsx apps/frontend/src/features/dashboard
git commit -m "feat: build house dashboard"
```

Expected: Dashboard tests, lint, typecheck PASS; commit succeeds.

### Task 6: Static house routes, summary and ordered history

**Files:**
- Create: `apps/frontend/src/app/houses/[houseCode]/page.tsx`
- Create: `apps/frontend/src/features/houses/house-detail-page.tsx`
- Test: `apps/frontend/src/features/houses/house-detail-page.spec.tsx`
- Create: `apps/frontend/src/features/houses/house-summary.tsx`
- Create: `apps/frontend/src/features/houses/cycle-history.tsx`

**Interfaces:**
- Consumes: `parkingApi.getHouse`, `queryKeys.house`, date utilities and shared UI
- Produces: `/houses/R5-001` through `/houses/R5-164`; passes selected actionable violation to Task 7 modals

- [ ] **Step 1: Read static export and dynamic params guides immediately before code**

```bash
sed -n '1,420p' apps/frontend/node_modules/next/dist/docs/01-app/02-guides/static-exports.md
sed -n '1,420p' apps/frontend/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md
```

Expected: confirm Next.js 16 `params` is a Promise and static export requires full param list.

- [ ] **Step 2: Write failing House Detail tests**

Assert:

- Loading skeleton, network retry and missing-history empty state.
- Breadcrumb `ภาพรวม / R5-001`, active/inactive badge, four current-cycle summary values.
- Cycles sorted descending by `cycleNumber` regardless API order.
- Active violations sorted ascending by `sequenceNumber`; cancelled violations last.
- Cancellation reason, payment date/reference and `—` for absent values render.
- Refresh calls detail `refetch`.
- Cancel action hidden for closed cycle, cancelled violation, or any paid fine in same cycle.
- Mark-paid shown only for `fine.status === "PENDING"` in open cycle.

Run: `pnpm --filter frontend test:run src/features/houses/house-detail-page.spec.tsx`

Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement static route and detail feature**

Route code contract:

```ts
export const dynamicParams = false;

export function generateStaticParams(): Array<{ houseCode: string }> {
  return Array.from({ length: 164 }, (_, index) => ({
    houseCode: `R5-${String(index + 1).padStart(3, "0")}`,
  }));
}

export default async function HousePage({
  params,
}: {
  params: Promise<{ houseCode: string }>;
}) {
  const { houseCode } = await params;
  return <HouseDetailPage houseCode={houseCode} />;
}
```

Detail query uses no polling and `refetchOnWindowFocus: false`. Show latest open cycle as current summary; when none, show zero counts and `ยังไม่มี Cycle ปัจจุบัน`. History uses semantic headings/table and horizontal overflow wrapper. Buttons must carry exact violation UUID internally, never fine ID.

- [ ] **Step 4: Run tests and commit**

```bash
pnpm --filter frontend test:run src/features/houses
pnpm --filter frontend lint
pnpm --filter frontend typecheck
git add 'apps/frontend/src/app/houses/[houseCode]/page.tsx' apps/frontend/src/features/houses
git commit -m "feat: add static house detail pages"
```

Expected: House Detail tests, lint, typecheck PASS; commit succeeds.

### Task 7: Create, cancel and mark-paid workflows

**Files:**
- Create: `apps/frontend/src/features/violations/create-violation-modal.tsx`
- Test: `apps/frontend/src/features/violations/create-violation-modal.spec.tsx`
- Create: `apps/frontend/src/features/violations/cancel-violation-modal.tsx`
- Test: `apps/frontend/src/features/violations/cancel-violation-modal.spec.tsx`
- Create: `apps/frontend/src/features/payments/mark-fine-paid-modal.tsx`
- Test: `apps/frontend/src/features/payments/mark-fine-paid-modal.spec.tsx`
- Modify: `apps/frontend/src/features/houses/house-detail-page.tsx`
- Modify: `apps/frontend/src/features/houses/cycle-history.tsx`

**Interfaces:**
- Consumes: schemas/date conversion, `parkingApi`, `queryKeys`, `Modal`, exact `violation.id`
- Produces: complete create/cancel/mark-paid user workflows

- [ ] **Step 1: Write failing Create Violation modal tests**

Assert labelled `วันเวลาเกิดเหตุ` and `หมายเหตุ`; future time and 1001-char note show field errors; valid submission converts local time to ISO; mutation gets `(houseCode, input)`; submit disabled while pending; success closes modal, shows `บันทึก Violation แล้ว`, and invalidates both query keys; API error keeps modal open and shows safe message.

Run: `pnpm --filter frontend test:run src/features/violations/create-violation-modal.spec.tsx`

Expected: FAIL because modal does not exist.

- [ ] **Step 2: Implement Create modal with React Hook Form + Zod**

Use `zodResolver(createViolationSchema(new Date()))`, default `occurredAt` from `toDateTimeLocalValue(new Date())`, trim/omit empty note, `localDateTimeToIso` before API call, and:

```ts
await Promise.all([
  queryClient.invalidateQueries({ queryKey: queryKeys.houses }),
  queryClient.invalidateQueries({ queryKey: queryKeys.house(houseCode) }),
]);
```

Run Create test. Expected: PASS.

- [ ] **Step 3: Write failing Cancel modal tests, then implement**

Assert required 5–500 trimmed reason; confirmation text exactly `ระบบจะเก็บประวัติการยกเลิกและคำนวณลำดับกับค่าปรับใหม่`; API receives selected `violation.id`; pending disables submit/close; success invalidates both keys and shows `ยกเลิก Violation แล้ว`; `CONCURRENT_MODIFICATION` renders `ข้อมูลมีการเปลี่ยนแปลง กรุณาลองใหม่` and keeps modal open.

Use `zodResolver(cancelViolationSchema)` and `parkingApi.cancelViolation(houseCode, violation.id, { reason })`.

Run: `pnpm --filter frontend test:run src/features/violations/cancel-violation-modal.spec.tsx`

Expected: PASS after implementation.

- [ ] **Step 4: Write failing Mark Paid modal tests, then implement**

Assert no amount input; show immutable confirmation; future/before-violation errors; reference trim/max 128; API receives selected `violation.id` and ISO `paidAt`; success invalidates both keys and shows `บันทึกการชำระแล้ว`; mutation error keeps modal open.

Use `zodResolver(markFinePaidSchema(violation.occurredAt, new Date()))`. Confirmation: `เมื่อบันทึกว่าชำระแล้ว จะย้อนกลับไม่ได้ในระบบนี้`. Never accept or send `amountBaht`.

Run: `pnpm --filter frontend test:run src/features/payments/mark-fine-paid-modal.spec.tsx`

Expected: PASS after implementation.

- [ ] **Step 5: Wire modal state into House Detail and run workflow regression**

House Detail owns discriminated state:

```ts
type ActiveDialog =
  | { type: "create" }
  | { type: "cancel"; violation: ViolationResponse }
  | { type: "markPaid"; violation: ViolationResponse }
  | null;
```

Create button hidden when house inactive. Cycle table passes `violation.id`; cancel visibility follows Task 6 rules; mark-paid visibility follows pending/open rule. Success notice uses `role="status"` and clears on next action.

Run:

```bash
pnpm --filter frontend test:run src/features/violations src/features/payments src/features/houses
pnpm --filter frontend lint
pnpm --filter frontend typecheck
git add apps/frontend/src/features
git commit -m "feat: add parking administration workflows"
```

Expected: all workflow suites, lint, typecheck PASS; commit succeeds.

### Task 8: Full verification, responsive browser check and operator docs

**Files:**
- Modify: `apps/frontend/README.md`
- Modify only if verification reveals defects: files introduced in Tasks 1–7

**Interfaces:**
- Consumes: complete Admin MVP and running Core Parking API
- Produces: verified static export and repeatable operator/test instructions

- [ ] **Step 1: Run complete automated frontend gate**

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm --filter frontend test:run
pnpm --filter frontend lint
pnpm --filter frontend typecheck
pnpm --filter frontend build
```

Expected: all tests PASS; lint/typecheck exit 0; Next build exits 0 and reports `/` plus static `/houses/[houseCode]` output.

- [ ] **Step 2: Verify all 164 exported house pages**

Run:

```bash
test -f apps/frontend/out/index.html
test -f apps/frontend/out/houses/R5-001.html
test -f apps/frontend/out/houses/R5-164.html
find apps/frontend/out/houses -name 'R5-*.html' | wc -l
```

Expected: files exist and count is `164`. If Next emits directory indexes instead, use the equivalent `R5-001/index.html` and assert 164 directories; document actual output shape.

- [ ] **Step 3: Run real backend and browser acceptance flow**

Start PostgreSQL/backend/frontend using existing README commands. In browser test desktop 1440×900 and mobile 390×844:

1. Dashboard loads 164 houses; search `164`; each filter changes result.
2. Open `/houses/R5-164`; direct refresh works.
3. Create violations with controlled test timestamps; sequence and fine rules display: 1–2 no fine, 3 = 1,000, 4 = 500, 5 = 500; total 2,000.
4. Cancel one unpaid violation using its violation UUID; sequence/fines refresh.
5. Mark pending fine paid; no online-payment controls appear; closed-cycle action rules update.
6. Force backend offline; retry error contains no stack/raw response.
7. Keyboard-only: reach controls, open/close dialogs, visible focus, focus returns.
8. Mobile: no viewport overflow except table wrapper; touch actions at least 44px.
9. Enable reduced motion; modal/skeleton motion disabled.

Expected: all nine checks pass. Capture failures as tests before fixing.

- [ ] **Step 4: Document setup and operations**

Update `apps/frontend/README.md` with:

- `NEXT_PUBLIC_API_URL=http://localhost:3001/api`
- install/dev/test/lint/typecheck/build commands
- routes `/` and `/houses/R5-001`…`R5-164`
- manual refresh behavior and no online payment statement
- browser acceptance checklist from Step 3

- [ ] **Step 5: Final repository verification and commit**

```bash
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
pnpm --recursive test --if-present
pnpm --recursive lint
pnpm --recursive build
git status --short
git add apps/frontend/README.md apps/frontend packages/shared-types pnpm-lock.yaml
git commit -m "docs: complete frontend admin MVP verification"
```

Expected: repository tests/lint/build PASS; status clean after commit. Do not push or merge without user request.
