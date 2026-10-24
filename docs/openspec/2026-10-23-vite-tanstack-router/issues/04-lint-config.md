# 04: lint config ใหม่

**What to build:** แทน `eslint-config-next` ด้วย `typescript-eslint` + `eslint-plugin-react-hooks` + `@tanstack/eslint-plugin-router` ignore `dist` และ `routeTree.gen.ts` ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-23-vite-tanstack-router/spec.md`

**Blocked by:** 01

**Status:** done

- [x] `pnpm --filter frontend lint` ผ่าน
- [x] ลบ `eslint-config-next` ออกจาก dependency

## Comments

- ใช้ `@eslint/js` + `typescript-eslint` (recommended) + `eslint-plugin-react-hooks` (flat recommended) + `@tanstack/eslint-plugin-router` (flat/recommended) ไฟล์ `*.config.*` ใช้ global ของ Node
- ignore `.next/` และ `out/` ที่เป็น build output เก่าของ Next ค้างในเครื่อง ลบสองโฟลเดอร์นี้ทิ้งได้
