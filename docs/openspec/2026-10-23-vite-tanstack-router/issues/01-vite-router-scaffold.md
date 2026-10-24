# 01: ย้ายไป Vite + TanStack Router

**What to build:** แทน Next ด้วย Vite + TanStack Router แบบ file-based โดยพฤติกรรมของ app เหมือนเดิม `AuthGate` ยังเป็น component แต่ใช้ hook ของ TanStack ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-23-vite-tanstack-router/spec.md`

**Blocked by:** none

**Status:** done

- [x] `vite.config.ts`: plugin react + router, port 3000, proxy `/api` ไป `http://localhost:3001`, alias `@/`
- [x] `index.html` มี `<title>`, `<meta name="robots" content="noindex,nofollow,noarchive">` และ `lang="th"`
- [x] `src/main.tsx` + `src/routes/` ครบ 7 route (`/`, `/login`, `/change-password`, `/houses`, `/houses/$houseCode`, `/users`, `/violation-categories`)
- [x] font `@fontsource/ibm-plex-sans-thai` ตั้ง `--font-body` เหมือนเดิม
- [x] `lib/api/client.ts` ใช้ `import.meta.env.VITE_API_URL ?? "/api"`
- [x] เปลี่ยน `next/link` และ `next/navigation` ใน 8 ไฟล์เป็นของ TanStack
- [x] render helper ของ test ที่ใช้ router จริงผ่าน `createMemoryHistory` แทน `vi.mock("next/navigation")` ใน 5 spec
- [x] ลบ `next`, `next.config.ts`, `next-env.d.ts`, plugin `next` ใน tsconfig, `src/app/` และ `lib/admin-metadata.ts`
- [x] script `dev`/`build`/`preview` ใช้ Vite, `.gitignore` มี `dist`
- [x] `.env.example` และ README เปลี่ยน `NEXT_PUBLIC_API_URL` เป็น `VITE_API_URL`
- [x] `pnpm test`, `typecheck` และ `build` ผ่าน (lint แก้ใน 04)

## Comments

- ทดสอบ `vite dev` จริงแล้ว: ทุก path (เช่น `/houses/R5-001`) ได้ `index.html` และ `/api/health` ผ่าน proxy ได้ผลเดียวกับเรียก backend ตรง login ผ่าน proxy ผ่าน Origin check (ได้ 401 ไม่ใช่ 403)
- ลบ `"use client"` ออกจากทุกไฟล์ เพราะ Vite ไม่ใช้
- `admin-metadata.spec.ts` ถูกแทนด้วย `src/index-html.spec.ts` ที่เช็ก meta robots และ `lang="th"` ใน `index.html`
- ลบ svg ของ Next template ใน `public/` ที่ไม่ได้ใช้
- `src/routeTree.gen.ts` ถูกสร้างโดย router plugin ต้อง commit ไว้เพื่อให้ `typecheck` รันได้โดยไม่ต้อง build ก่อน
