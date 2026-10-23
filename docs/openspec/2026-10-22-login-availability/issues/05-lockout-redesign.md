# 05: ออกแบบ lockout และงาน argon2 ก่อนยืนยันตัวตนใหม่

**What to build:** ตัดสินใจรูปแบบ lockout และวิธีลดงาน argon2 ของ login แบบ anonymous ด้วย `/grill-me` แล้วแตกผลเป็น issue ใหม่ใน folder นี้ ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-22-login-availability/spec.md`

**Blocked by:** none

**Status:** needs-triage

คำถามที่ต้องได้ข้อสรุป

- [ ] บัญชีที่ล็อกอยู่ ควรตอบกลับก่อนรัน argon2 ไหม และจะรักษาเวลาตอบให้เท่ากับกรณีอื่นอย่างไร ตอนนี้ lock เช็กหลัง `verify` (`apps/backend/src/auth/auth.service.ts:42-55`)
- [ ] ควร cap จำนวน argon2 ที่รันพร้อมกันทั้ง process ไหม และเกิน cap แล้วตอบอะไร
- [ ] lockout ควรผูกกับอะไร: user id อย่างเดียว (แบบเดิม), username + IP หรือเพิ่มเวลาล็อกเป็นขั้น
- [ ] admin ควรปลดล็อกบัญชีได้ไหม ถ้าได้ต้องมี endpoint และ UI ใหม่ (UI ทำหลังย้ายไป Vite + TanStack Router)
- [ ] การใส่ `currentPassword` ผิดใน change-password ควรนับเข้า lockout ไหม (ต่อจาก 01)
