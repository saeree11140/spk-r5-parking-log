# 10: ไม่ยอมรับ TRUST_PROXY_HOPS=0 ใน production

**What to build:** production ยอมให้ `TRUST_PROXY_HOPS=0` ถ้าอยู่หลัง Traefik ค่านี้ทำให้ทุก client ใช้ key ของ throttle และ lockout ร่วมกัน ต้องตัดสินใจว่าจะห้ามค่า 0 ไปเลย หรือยอมให้ใช้ได้โดยต้องตั้ง opt-out ชัดเจน ดูรายละเอียดใน spec ที่ `docs/openspec/2026-11-01-security-hardening/spec.md`

**Blocked by:** none

**Status:** needs-triage

- [ ] ตัดสินใจแล้วบันทึกใน Comments
- [ ] test ของ `requireAuthEnvironment`

## Comments
