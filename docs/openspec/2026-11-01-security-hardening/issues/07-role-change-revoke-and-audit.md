# 07: ลด role แล้ว revoke session และบันทึก audit

**What to build:** การลด role ADMIN ไม่ revoke session และไม่มี audit action ของตัวเอง ตอนนี้ยังปลอดภัยเพราะ guard โหลด role จาก DB ใหม่ทุก request แต่ audit แยกการเปลี่ยน role ออกจากการแก้ข้อมูลอื่นไม่ได้ ดูรายละเอียดใน spec ที่ `docs/openspec/2026-11-01-security-hardening/spec.md`

**Blocked by:** none

**Status:** needs-triage

- [ ] ตัดสินใจเรื่อง revoke แล้วบันทึกใน Comments
- [ ] การเปลี่ยน role มี audit action ของตัวเอง

## Comments
