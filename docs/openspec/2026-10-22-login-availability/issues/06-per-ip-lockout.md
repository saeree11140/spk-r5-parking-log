# 06: lockout ต่อ (user, IP)

**What to build:** login ผิด 5 ครั้งจาก IP เดียวกันล็อกเฉพาะ user นั้นที่ IP นั้น 15 นาที แทนการล็อกทั้งบัญชี counter เก็บใน table ใหม่ `login_failures` (user_id, ip_address, failed_count, locked_until) อัปเดตใน serializable transaction ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-22-login-availability/spec.md` และคำตอบใน `05-lockout-redesign.md`

**Blocked by:** none

**Status:** done

- [x] migration: table `login_failures` unique (user_id, ip_address) และรีเซ็ต `failed_login_attempts`/`locked_until` ของทุก user
- [x] ผิดครบ 5 ครั้งจาก IP เดียว: IP นั้นล็อก IP อื่นยัง login ได้
- [x] ไม่สร้างแถวให้ username ที่ไม่มีในระบบ
- [x] login สำเร็จล้างเฉพาะแถว (user, IP) นั้น
- [x] admin reset-password ล้างทุกแถวของ user นั้น
- [x] `auth:sessions:cleanup` ลบแถวที่ไม่ได้ล็อกและเก่ากว่า 1 วัน
- [x] ยังรัน argon2 ทุกครั้ง (ไม่ตัดจบบัญชีที่ล็อก)
- [x] e2e ครอบทุกข้อข้างบน ยกเว้น cleanup (ดู Comments)

## Comments

- ไม่มี test ของการลบแถวใน `auth:sessions:cleanup` เพราะ script รัน `main()` ตรงๆ ไม่มี seam ให้เรียกจาก test
- test lockout เดิมที่ query column `failed_login_attempts` ตรงๆ ถูกแทนด้วย test ที่ดูจากพฤติกรรม (IP อื่นยัง login ได้)
