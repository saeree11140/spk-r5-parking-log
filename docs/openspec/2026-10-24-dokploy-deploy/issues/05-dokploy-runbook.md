# 05: คู่มือตั้งค่า Dokploy

**What to build:** `docs/deploy/dokploy.md` อธิบายทีละขั้น: สร้าง Postgres 18 (ไม่ publish port), สร้าง application backend และ frontend จาก image ใน GHCR, ตั้ง env ของ backend, ตั้งโดเมนเดียวที่ส่ง `/api` ไป backend (ไม่ strip path) และที่เหลือไป frontend, memory limit, seed ครั้งแรก, ตั้งเวลารัน `auth:sessions:cleanup` วันละครั้ง และวิธี deploy เวอร์ชันใหม่ ค่าที่ขึ้นกับโดเมนเว้นเป็น placeholder ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-24-dokploy-deploy/spec.md`

**Blocked by:** 02, 03

**Status:** done

- [x] ทำตามคู่มือบน Dokploy ที่ติดตั้งอยู่ได้จริง (หลังได้โดเมนหรือใช้ `sslip.io` ทดสอบ)
- [x] ระบุ env ทุกตัวที่ backend ต้องใช้ และบอกว่าตัวไหนเป็น secret

## Comments

- เขียน `docs/deploy/dokploy.md` แล้ว: 3 service (Postgres 18 ไม่ publish port, backend, frontend), env ทั้งหมดพร้อมบอกว่าตัวไหนเป็น secret, โดเมนเดียวที่ส่ง `/api` ไป backend (ปิด Strip Path), memory limit, seed ครั้งแรกโดยไม่เก็บรหัส ADMIN ไว้ใน env, ตั้งเวลา cleanup, deploy เวอร์ชันใหม่, ย้อนเวอร์ชัน, ลบ image เก่า และปลดล็อกฉุกเฉิน
- ยังไม่ได้ทดสอบทำตามบน Dokploy จริง ชื่อเมนูอาจต่างตามเวอร์ชันของ Dokploy
- ขั้นตั้งค่าเครื่องแยกเป็น `docs/deploy/vps-setup.md` (issue 06–09)
- 2026-10-25: deploy จริงบน Dokploy v0.30.10 ที่ `https://parking.spkr5.com` แล้ว: Postgres (`shared_buffers` 64MB, `max_connections` 20, limit 256 MB, ไม่มี port ออก internet), backend (`/api/health` 200, Origin อื่นได้ 403), frontend (SPA fallback, CSP, HSTS, asset cache 1 ปี), seed แล้ว ADMIN login และเปลี่ยนรหัสผ่านได้ ภาพรวมขึ้นบ้าน 164 หลัง
- สิ่งที่แก้ในคู่มือหลังทำจริง: ชื่อ container จริงเป็น `spkr5parkinglog-spkr5backend-…` (ตัวกรองเดิม `name=spk-r5-backend` ไม่เจอ), ต้องกด Save ของกล่อง Provider ไม่งั้นได้ `Github Provider not found`, `DATABASE_URL` ที่ผิดได้ `P1013`, Postgres ตั้ง tuning ผ่าน Arguments ไม่ใช่ Command, memory limit กรอกเป็น byte, seed ที่สำเร็จไม่พิมพ์อะไร
- secret ชุดแรกที่สร้างหลุดเข้าแชต จึงสร้างใหม่ก่อนใช้ ค่าที่ใช้จริงไม่ตรงกับชุดนั้น
- ตั้ง schedule `cleanup-auth-sessions` (`0 3 * * *` Asia/Bangkok) แล้ว กด Run ได้ `cleanup-ok` และเปิด Daily Docker Cleanup ใน Settings > Web Server แล้ว
