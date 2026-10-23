# 11: คำสั่ง CLI ปลดล็อกฉุกเฉิน

**What to build:** `pnpm --filter backend auth:unlock <username>` ล้าง lock ทุกแบบของ user (แถว `login_failures` และเพดานรวม) และเขียน audit `UNLOCK` actor `SYSTEM` ใช้ตอน ADMIN คนเดียวถูกล็อก ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-22-login-availability/spec.md` และคำตอบใน `05-lockout-redesign.md`

**Blocked by:** 07, 09

**Status:** done

- [x] script ใน `apps/backend/prisma/` แบบเดียวกับ `cleanup-auth-sessions.ts`
- [x] username ไม่มีในระบบ: exit code ไม่เป็น 0 และไม่เขียน audit
- [x] test ของ logic ปลดล็อกกับ DB ทดสอบ
- [x] README บอกวิธีใช้
