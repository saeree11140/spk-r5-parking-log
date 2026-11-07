# 02: ผูก Postgres ใน compose ไว้กับ loopback

**What to build:** `compose.yaml` publish Postgres เป็น `${POSTGRES_PORT:-5432}:5432` ซึ่งเปิดทุก interface ให้เปลี่ยนเป็น `127.0.0.1:${POSTGRES_PORT:-5432}:5432` เพื่อไม่ให้ DB ของเครื่อง dev เปิดออก LAN ดูรายละเอียดใน spec ที่ `docs/openspec/2026-11-01-security-hardening/spec.md`

**Blocked by:** none

**Status:** done

- [x] port ผูกกับ `127.0.0.1` เท่านั้น
- [ ] `pnpm db:up` กับ e2e ในเครื่องยังใช้ได้ (ยังไม่ได้รัน เพราะ docker ในเครื่องไม่ได้เปิด)

## Comments

- 2026-11-01: เปลี่ยน port เป็น `127.0.0.1:${POSTGRES_PORT:-5432}:5432` และ `docker compose config` แสดง `host_ip: 127.0.0.1` แล้ว `DATABASE_URL` ใน `.env.example` ใช้ `localhost` อยู่แล้วจึงไม่ต้องแก้ ส่วนรหัส default `spk_r5_local` ยังเก็บไว้ เพราะตอนนี้ DB เข้าถึงได้จาก loopback เท่านั้น และถ้าบังคับให้ตั้งรหัสเองจะทำให้ `pnpm db:up` ใช้ไม่ได้เมื่อไม่มี `.env`
