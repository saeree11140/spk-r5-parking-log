# 08: ตอบ 423 เมื่อรหัสถูกแต่บัญชีถูกล็อก

**What to build:** login ที่รหัสถูกแต่ติด lock (ต่อ IP หรือเพดานรวม) ตอบ 423 `AUTH_ACCOUNT_LOCKED` กรณีอื่นตอบ 401 `AUTH_INVALID_CREDENTIALS` เหมือนเดิม หน้า login แสดง "บัญชีถูกล็อกชั่วคราว กรุณาลองใหม่ภายหลังหรือติดต่อผู้ดูแลระบบ" โดยไม่บอกเวลา ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-22-login-availability/spec.md` และคำตอบใน `05-lockout-redesign.md`

**Blocked by:** 07

**Status:** done

- [x] e2e: รหัสถูกแต่ล็อกได้ 423 `AUTH_ACCOUNT_LOCKED`
- [x] e2e: รหัสผิดขณะล็อกได้ 401 `AUTH_INVALID_CREDENTIALS`
- [x] component test หน้า login แสดงข้อความภาษาไทย
