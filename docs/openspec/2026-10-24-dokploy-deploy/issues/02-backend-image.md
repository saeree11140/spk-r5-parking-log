# 02: Docker image ของ backend

**What to build:** `apps/backend/Dockerfile` แบบ multi-stage บน `node:22-bookworm-slim` ใช้ `pnpm deploy` เอาเฉพาะ dependency production รันด้วย user ที่ไม่ใช่ root entrypoint รัน `prisma migrate deploy` แล้วจึง `node dist/main` มี `HEALTHCHECK` ที่ `/api/health` และ `.dockerignore` ที่ root ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-24-dokploy-deploy/spec.md`

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] build image ได้ในเครื่อง และขนาด image อยู่ในระดับร้อย MB ไม่ใช่หลาย GB
- [ ] รันกับ Postgres ในเครื่อง: migration รันเอง, health เป็น healthy, login ได้ผ่าน API
- [ ] รัน seed ครั้งแรกใน container ได้ด้วยคำสั่งเดียว (ส่ง `ADMIN_*` เฉพาะตอนรัน)
- [ ] ใน image ไม่มี `.env`, source `.ts` และ dev dependency
