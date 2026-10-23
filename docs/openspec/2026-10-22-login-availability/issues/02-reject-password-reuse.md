# 02: ห้ามตั้งรหัสใหม่ซ้ำกับรหัสปัจจุบัน

**What to build:** `AuthService.changePassword` (`apps/backend/src/auth/auth.service.ts:206-238`) ปฏิเสธเมื่อ `newPassword` ตรงกับรหัสปัจจุบัน ผู้ใช้ที่ได้รหัสชั่วคราวจาก admin จะได้ต้องตั้งรหัสใหม่จริง และ admin ไม่รู้รหัสของผู้ใช้อีก ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-22-login-availability/spec.md`

**Blocked by:** none

**Status:** done

- [x] เช็กหลังยืนยัน `currentPassword` สำเร็จ โดยเทียบ `newPassword` กับ hash ปัจจุบันด้วย `passwordService.verify` (ไม่เทียบ string กับ `currentPassword` อย่างเดียว)
- [x] ได้ 400 พร้อม error code ใหม่ เช่น `AUTH_PASSWORD_REUSED`
- [x] e2e สำหรับผู้ใช้ที่มี `mustChangePassword` (ไม่ได้เพิ่ม unit test ดู Comments)
- [x] frontend แสดงข้อความภาษาไทยของ error นี้ในหน้าเปลี่ยนรหัสผ่าน

## Comments

- ไม่ได้เพิ่ม unit test ใหม่ใน `auth.service.spec.ts` เพราะ e2e ครอบพฤติกรรมนี้ผ่าน HTTP แล้ว แต่แก้ mock ของ `passwordService.verify` ใน test "revokes other sessions when password changes" ให้คืน true เฉพาะรหัสปัจจุบัน เพราะ `changePassword` เรียก `verify` สองครั้งแล้ว
