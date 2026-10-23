# 01: จำกัดการเดารหัสผ่านผ่าน change-password

**What to build:** `POST /api/auth/change-password` ใช้ throttler `auth` (10 ครั้งต่อนาที, block 60 วินาที) แบบเดียวกับ login และ refresh ตอนนี้ `AuthController` มี `@SkipThrottle({ auth: true })` ที่ระดับ class (`apps/backend/src/auth/auth.controller.ts:20`) endpoint นี้จึงมีแค่ limit default 120 ครั้งต่อนาที ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-22-login-availability/spec.md`

**Blocked by:** none

**Status:** done

- [x] handler `changePassword` มี `@SkipThrottle({ auth: false })` และ `@Throttle` ค่าเดียวกับ login
- [x] e2e: ส่ง `currentPassword` ผิดเกิน 10 ครั้งในหนึ่งนาทีได้ 429
- [x] request ที่ถูกต้องยังเปลี่ยนรหัสได้ตามปกติ

## Comments

- การนับครั้งที่ผิดใน change-password เข้า lockout ของบัญชี ยกไปตัดสินใจใน 05 เพราะเท่ากับให้คนที่ถือ session ล็อกบัญชีเจ้าของได้
