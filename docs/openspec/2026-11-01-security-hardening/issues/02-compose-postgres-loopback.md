# 02: ผูก Postgres ใน compose ไว้กับ loopback

**What to build:** `compose.yaml` publish Postgres เป็น `${POSTGRES_PORT:-5432}:5432` ซึ่งเปิดทุก interface ให้เปลี่ยนเป็น `127.0.0.1:${POSTGRES_PORT:-5432}:5432` เพื่อไม่ให้ DB ของเครื่อง dev เปิดออก LAN ดูรายละเอียดใน spec ที่ `docs/openspec/2026-11-01-security-hardening/spec.md`

**Blocked by:** none

**Status:** ready-for-agent

- [ ] port ผูกกับ `127.0.0.1` เท่านั้น
- [ ] `pnpm db:up` กับ e2e ในเครื่องยังใช้ได้

## Comments
