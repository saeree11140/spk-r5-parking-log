# 09: cookie prefix และ security header ของ API

**What to build:** cookie ยังไม่ใช้ prefix `__Host-`/`__Secure-` และ response ของ API ที่ผ่าน Traefik ไม่มี `nosniff`, `frame-ancestors` และ `Cache-Control: no-store` ต้องตัดสินใจเรื่อง dev ที่รันบน http, การเปลี่ยนชื่อ cookie (ผู้ใช้ที่ login อยู่จะหลุด) และที่วางของ header ดูรายละเอียดใน spec ที่ `docs/openspec/2026-11-01-security-hardening/spec.md`

**Blocked by:** none

**Status:** needs-triage

- [ ] ตัดสินใจแล้วบันทึกใน Comments
- [ ] test ของ cookie และ header

## Comments
