# 01: compile script บน server เป็น JS

**What to build:** seed, `cleanup-auth-sessions` และ `unlock-user` ใน `apps/backend/prisma/` compile เป็น JS ไปกับ `nest build` เพื่อให้ image production รันด้วย `node` ได้โดยไม่ต้องมี `tsx` ย้าย `prisma` CLI เป็น dependency ที่ production ใช้ เพราะ container รัน `prisma migrate deploy` ตอน start ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-24-dokploy-deploy/spec.md`

**Blocked by:** none

**Status:** done

- [x] `pnpm --filter backend build` สร้าง JS ของทั้ง 3 script ใน `dist/`
- [x] รัน JS ที่ build แล้วได้จริงกับ DB ในเครื่อง: unlock กับ username ที่ไม่มีได้ exit code 1 และ cleanup รันจบ
- [x] script สำหรับ dev (`tsx`) ใช้ได้เหมือนเดิม
- [x] `prisma` อยู่ใน `dependencies`

## Comments

- ย้าย script ไปไว้ที่ `apps/backend/src/scripts/` แทนการให้ `nest build` compile `prisma/` ด้วย เพราะแบบนั้น `dist/main.js` จะเลื่อนไปเป็น `dist/src/main.js` แล้ว `start:prod` พัง
- คำสั่งบน production: `seed:prod`, `auth:sessions:cleanup:prod`, `auth:unlock:prod` (เรียก `node dist/scripts/*.js`) ส่วนคำสั่ง dev เดิมยังใช้ `tsx`
- ทดสอบ JS ที่ build แล้ว: unlock กับ username ที่ไม่มีได้ exit 1, cleanup และ seed (กับ DB `_test`) ได้ exit 0 และ e2e 64 ตัวผ่านด้วย `tsx src/scripts/seed.ts`
- ไม่ได้แก้ path ใน `docs/superpowers/` เพราะเป็นเอกสารประวัติ
