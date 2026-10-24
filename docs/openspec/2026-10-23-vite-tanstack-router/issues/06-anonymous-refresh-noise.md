# 06: ไม่เรียก refresh เมื่อไม่มี session

**What to build:** ตอนนี้ทุกครั้งที่เปิดหน้าเว็บโดยยังไม่ login `GET /auth/me` ได้ 401 แล้ว client ลอง `POST /auth/refresh` ซึ่งได้ 403 `CSRF_INVALID` (ไม่มี cookie `spk_r5_csrf`) แล้ววนไป `GET /auth/csrf` ที่ได้ 401 ทุก request นับเข้า throttle `auth` ของ refresh (10 ครั้ง/นาที/IP) การเปิดหน้า login ซ้ำหลายครั้งใน 1 นาทีจึงทำให้ refresh ของ user จริงจาก IP เดียวกันได้ 429 ได้ (ทดสอบแล้วได้ 429 จริง) ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-23-vite-tanstack-router/spec.md`

**Blocked by:** 02

**Status:** done

- [x] ตัดสินใจ: client ไม่ลอง refresh ถ้าไม่มี cookie `spk_r5_csrf` (แปลว่าไม่เคยมี session) หรือ backend ยกเว้น double-submit ให้ refresh แบบเดียวกับ login (ยังเช็ก Origin)
- [x] test: เปิดหน้า `/login` โดยไม่มี session ต้องไม่มี request ไป `/auth/refresh`

## Comments

- เลือกทาง client: interceptor ไม่เรียก `/auth/refresh` ถ้าไม่มี cookie `spk_r5_csrf` (cookie นี้มีอายุเท่ากับ session) แต่แจ้ง `authExpiredHandler` แล้วคืน 401 เดิม backend ไม่เปลี่ยน
- Playwright กับ dev server: เปิด `/`, `/houses/R5-001`, `/login` โดยไม่ login มีแค่ `GET /api/auth/me 401` หน้าละครั้ง ไม่มี refresh (ก่อนแก้มี 4 request ต่อหน้า) และคนที่ login อยู่แต่ access cookie หาย ยัง refresh ได้ (`me 401`, `refresh 201`, `me 200`)
- test `coordinates refresh rotation through a cross-tab Web Lock` ต้องตั้ง CSRF cookie ก่อน เพราะ refresh เกิดเฉพาะเมื่อมี session แล้ว
- `app-routing.spec.tsx` โหลด route tree ใน `beforeAll` (timeout 30 วินาที) เพราะตอนรันทั้งชุด test แรกเกิน 5 วินาทีจากการ import ทุก route
