# 05: คู่มือตั้งค่า Dokploy

**What to build:** `docs/deploy/dokploy.md` อธิบายทีละขั้น: สร้าง Postgres 18 (ไม่ publish port), สร้าง application backend และ frontend จาก image ใน GHCR, ตั้ง env ของ backend, ตั้งโดเมนเดียวที่ส่ง `/api` ไป backend (ไม่ strip path) และที่เหลือไป frontend, memory limit, seed ครั้งแรก, ตั้งเวลารัน `auth:sessions:cleanup` วันละครั้ง และวิธี deploy เวอร์ชันใหม่ ค่าที่ขึ้นกับโดเมนเว้นเป็น placeholder ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-24-dokploy-deploy/spec.md`

**Blocked by:** 02, 03

**Status:** ready-for-human

- [ ] ทำตามคู่มือบน Dokploy ที่ติดตั้งอยู่ได้จริง (หลังได้โดเมนหรือใช้ `sslip.io` ทดสอบ)
- [ ] ระบุ env ทุกตัวที่ backend ต้องใช้ และบอกว่าตัวไหนเป็น secret

## Comments

- เขียน `docs/deploy/dokploy.md` แล้ว: 3 service (Postgres 18 ไม่ publish port, backend, frontend), env ทั้งหมดพร้อมบอกว่าตัวไหนเป็น secret, โดเมนเดียวที่ส่ง `/api` ไป backend (ปิด Strip Path), memory limit, seed ครั้งแรกโดยไม่เก็บรหัส ADMIN ไว้ใน env, ตั้งเวลา cleanup, deploy เวอร์ชันใหม่, ย้อนเวอร์ชัน, ลบ image เก่า และปลดล็อกฉุกเฉิน
- ยังไม่ได้ทดสอบทำตามบน Dokploy จริง ชื่อเมนูอาจต่างตามเวอร์ชันของ Dokploy
- ขั้นตั้งค่าเครื่องแยกเป็น `docs/deploy/vps-setup.md` (issue 06–09)
