# 04: secret ของ JWT และ pepper ต้องไม่ซ้ำกัน

**What to build:** `requireAuthEnvironment` (`apps/backend/src/auth/auth-environment.ts:9-30`) throw ตอน start เมื่อ `JWT_ACCESS_SECRET` เท่ากับ `AUTH_TOKEN_PEPPER` หลัง trim ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-22-login-availability/spec.md`

**Blocked by:** none

**Status:** done

- [x] unit test ใน `auth-environment.spec.ts`: ค่าเท่ากันต้อง throw ค่าต่างกันผ่าน
- [x] ข้อความ error บอกชื่อตัวแปรทั้งสอง แต่ไม่แสดงค่า
- [x] `.env.example` ระบุว่าสองค่านี้ต้องต่างกัน
