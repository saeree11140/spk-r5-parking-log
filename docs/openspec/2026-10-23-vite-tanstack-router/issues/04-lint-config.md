# 04: lint config ใหม่

**What to build:** แทน `eslint-config-next` ด้วย `typescript-eslint` + `eslint-plugin-react-hooks` + `@tanstack/eslint-plugin-router` ignore `dist` และ `routeTree.gen.ts` ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-23-vite-tanstack-router/spec.md`

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `pnpm --filter frontend lint` ผ่าน
- [ ] ลบ `eslint-config-next` ออกจาก dependency
