# 12: บังคับตั้ง TRUST_PROXY_HOPS ใน production

**What to build:** `requireAuthEnvironment` throw ตอน start เมื่อ `NODE_ENV=production` และไม่ได้ตั้ง `TRUST_PROXY_HOPS` เพราะ lockout ต่อ IP พึ่ง `req.ip` ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-22-login-availability/spec.md` และคำตอบใน `05-lockout-redesign.md`

**Blocked by:** none

**Status:** done

- [x] unit test ใน `auth-environment.spec.ts`
- [x] `.env.example` และ README อธิบายผลของค่าที่ผิด
