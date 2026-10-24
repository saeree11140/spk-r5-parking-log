# Spec: Deploy ระบบขึ้น VPS ที่ใช้ Dokploy

Status: ready-for-agent
Started: 2026-10-24

## Problem Statement

VPS ของ Hostatom (Ubuntu 20.04, 1 vCPU, RAM 1.9 GiB ไม่มี swap, disk เหลือ 13 GB) รัน Dokploy อยู่แล้ว Traefik ของ Dokploy จับ port 80/443 บน host ไม่มี nginx, Node และ psql ตอนนี้ยังไม่มีวิธีพาระบบนี้ขึ้นเครื่อง: ไม่มี Dockerfile, ไม่มี CI และ script บน server (seed, cleanup, unlock) รันด้วย `tsx` ที่เป็น devDependency ผู้ใช้จริงมี 2 คน

## Solution

- GitHub Actions รัน lint, typecheck, unit test และ backend e2e (Postgres เป็น service container) แล้วจึง build image backend และ frontend push ไป GHCR แบบ public ตอน push `main` (tag `latest` และ commit SHA) ไม่ build บน VPS เพราะเครื่องเล็กเกิน
- กด deploy ใน Dokploy เอง ช่วงหลังค่อยเปลี่ยนเป็น webhook
- backend: `node:22-bookworm-slim`, รัน `prisma migrate deploy` ทุกครั้งที่ start, `HEALTHCHECK` ที่ `/api/health`, script บน server compile เป็น JS ไม่มี `tsx` ใน image
- seed รันเองครั้งเดียวผ่าน terminal ของ Dokploy โดยส่ง `ADMIN_*` เฉพาะตอนรัน
- frontend: `nginx-unprivileged` เสิร์ฟ `dist/` พร้อม SPA fallback, security header, CSP และ cache แบบเดียวกับ `deploy/nginx/spk-r5-parking-log.conf.example`
- Postgres: database service ของ Dokploy เวอร์ชัน 18 ไม่ publish port
- Traefik ส่ง `/api` ไป backend และที่เหลือไป frontend บนโดเมนเดียว (CSRF ต้องการ origin เดียว)
- `auth:sessions:cleanup` รันวันละครั้งด้วยการตั้งเวลารันของ Dokploy (ถ้าไม่มีใช้ cron บน host)
- memory limit: backend 384 MB, Postgres 256 MB (`shared_buffers=64MB`, `max_connections=20`), frontend 32 MB
- image เป็นสถาปัตยกรรมเดียวตามผล `uname -m` ของ VPS (รอข้อมูล)

## Out of Scope (รอคำตอบ Hostatom ticket #JHJ-806230)

- firewall (เปิดแค่ 22, 80, 443 และปิด `:3000` ของ Dokploy กับ port ของ Docker Swarm)
- swap, อัปเกรด Ubuntu หรือเปิด Ubuntu Pro, user ที่ไม่ใช่ root
- โดเมน, HTTPS, โดเมนของหน้า Dokploy, ค่า `FRONTEND_URL` และ `TRUST_PROXY_HOPS` จริง
- ปลายทาง backup (บน VPS 7 วัน + ส่งออกนอกเครื่อง เช่น Cloudflare R2)
