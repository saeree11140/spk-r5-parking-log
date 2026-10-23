# 09: audit ตอนบัญชีถูกล็อก

**What to build:** เพิ่ม `AuditAction` `LOCK` และ `UNLOCK` เขียน `LOCK` ตอนที่ (user, IP) หรือเพดานรวมเปลี่ยนเป็นล็อก actor เป็น `SYSTEM` เก็บ IP และชนิด lock ใน `after` ไม่ log ทุกครั้งที่ผิด ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-22-login-availability/spec.md` และคำตอบใน `05-lockout-redesign.md`

**Blocked by:** 06

**Status:** done

- [x] migration เพิ่มค่า enum `LOCK`, `UNLOCK`
- [x] e2e: ครั้งที่ 5 จาก IP เดียวเขียน `LOCK` หนึ่งแถว ครั้งที่ 1–4 ไม่เขียน
- [x] e2e: เพดานรวมเขียน `LOCK` หนึ่งแถว
