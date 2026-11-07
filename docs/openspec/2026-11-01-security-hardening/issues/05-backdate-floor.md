# 05: ใช้ขอบเขตการย้อนเวลาทุกเส้นทาง

**What to build:** `BACKDATE_NOT_ALLOWED` ที่เทียบกับ cycle ก่อนหน้าจะเช็กเฉพาะตอนเปิด cycle ใหม่ ส่วน PATCH violation กับการสร้าง violation ลงใน cycle ที่เปิดอยู่ยังตั้ง `occurredAt` ย้อนไปก่อน cycle ก่อนหน้าได้ ต้องตัดสินใจกฎก่อน ดูรายละเอียดใน spec ที่ `docs/openspec/2026-11-01-security-hardening/spec.md`

**Blocked by:** none

**Status:** needs-triage

- [ ] ตัดสินใจกฎแล้วบันทึกใน Comments
- [ ] test ครอบทั้ง create และ update

## Comments
