# 08: ระบุตัวผู้กระทำใน audit log ให้แน่นอน

**What to build:** `actorLabel` เก็บ `displayName` ซึ่งแก้ได้ภายหลัง ทำให้ audit ย้อนหลังระบุตัวคนไม่ได้แน่นอน โดยเฉพาะตอน ADMIN reset รหัสของ ADMIN อีกคน ดูรายละเอียดใน spec ที่ `docs/openspec/2026-11-01-security-hardening/spec.md`

**Blocked by:** none

**Status:** needs-triage

- [ ] ตัดสินใจว่า label เก็บอะไร แล้วบันทึกใน Comments
- [ ] test ของ audit actor

## Comments
