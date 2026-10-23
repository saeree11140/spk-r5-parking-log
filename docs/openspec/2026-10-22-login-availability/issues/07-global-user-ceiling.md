# 07: เพดานรวมต่อ user

**What to build:** นับ login ผิดของ user จากทุก IP ในหน้าต่าง 1 ชั่วโมง ครบ 20 ครั้งล็อกทั้งบัญชี 15 นาที ใช้ column `failed_login_attempts`, `locked_until` เดิม และเพิ่ม `failed_window_started_at` บน `users` login สำเร็จไม่ล้างเพดานรวม ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-22-login-availability/spec.md` และคำตอบใน `05-lockout-redesign.md`

**Blocked by:** 06

**Status:** done

- [x] migration เพิ่ม `failed_window_started_at`
- [x] ผิดรวม 20 ครั้งจากหลาย IP ภายใน 1 ชั่วโมงล็อกทั้งบัญชี ทุก IP login ไม่ได้
- [x] พ้น 1 ชั่วโมงจากครั้งแรกของหน้าต่าง counter เริ่มใหม่
- [x] login สำเร็จไม่ล้างเพดานรวม
- [x] admin reset-password ล้างเพดานรวม
- [x] e2e ครอบทุกข้อข้างบน

## Comments

- การเริ่มหน้าต่างใหม่หลัง 1 ชั่วโมงทดสอบด้วย unit test เพราะ e2e ข้ามเวลาไม่ได้ เขียน test หลังโค้ด แล้วลองเปลี่ยนค่าหน้าต่างเพื่อยืนยันว่า test จับได้
- login สำเร็จยังเคลียร์ `locked_until` ของบัญชีที่หมดอายุแล้ว แต่ไม่ล้าง counter
