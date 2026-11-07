# 01: อัป dependency ของ Express ที่มีช่องโหว่

**What to build:** อัป `proxy-addr` เป็น >=2.0.8, `body-parser` เป็น >=2.4.0 และ `qs` เป็น >=6.16.1 ทั้งสามมาทาง `@nestjs/platform-express` และ `express` ของ backend ดูรายละเอียดใน spec ที่ `docs/openspec/2026-11-01-security-hardening/spec.md`

**Blocked by:** none

**Status:** done

- [x] `pnpm audit --prod` ไม่เหลือ advisory ของสาม package นี้
- [ ] unit test และ e2e ของ backend ผ่าน (unit ผ่านแล้ว e2e ยังไม่ได้รัน เพราะ docker ในเครื่องไม่ได้เปิด)

## Comments

- 2026-11-01: `pnpm update -r --depth Infinity proxy-addr body-parser qs` ได้ `proxy-addr` 2.0.8, `body-parser` 2.4.0 และ `qs` 6.17.1 ไม่ต้องใช้ override เพราะช่วง version ของ express ครอบอยู่แล้ว ต้องลบ metadata cache ของ `content-type` ก่อน (`pnpm cache delete content-type`) เพราะ cache เก่าไม่มี 2.1.0 ที่ `body-parser` 2.4.0 ต้องใช้
- lockfile มี patch/minor ของ build tooling ขยับตามมาด้วย (acorn, terser, browserslist, webpack-sources, schema-utils) รวมถึง `react-is` 19.3.1 ฝั่ง frontend
- `pnpm audit --prod` ลดจาก 55 เหลือ 38 และไม่มี critical ที่เหลือคือ multer (ไม่มี route upload), axios/follow-redirects/zod (ฝั่ง browser) และ hono/mysql2/valibot/deepmerge-ts (Prisma CLI) ซึ่งอยู่นอก scope ของ spec นี้
- unit test ผ่าน (backend 144, frontend 163) และ build ทั้งสองแอปผ่าน
