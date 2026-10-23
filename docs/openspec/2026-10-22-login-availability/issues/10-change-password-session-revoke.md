# 10: change-password ผิด 5 ครั้งแล้ว revoke session

**What to build:** นับ `currentPassword` ผิดต่อ session ใน column ใหม่ `failed_password_checks` บน `auth_sessions` ครบ 5 ครั้ง revoke session นั้น เขียน audit `LOCK` และตอบ 401 `AUTH_REQUIRED` ไม่นับเข้า lockout ของ login ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-22-login-availability/spec.md` และคำตอบใน `05-lockout-redesign.md`

**Blocked by:** 09

**Status:** done

- [x] migration เพิ่ม `failed_password_checks`
- [x] e2e: ผิดครั้งที่ 5 ได้ 401 `AUTH_REQUIRED` และ request ต่อไปของ session นั้นได้ 401
- [x] e2e: เจ้าของยัง login ใหม่ได้ (ไม่ถูกล็อก)
- [x] e2e: เขียน audit `LOCK`
