# 02: Docker image ของ backend

**What to build:** `apps/backend/Dockerfile` แบบ multi-stage บน `node:22-bookworm-slim` ใช้ `pnpm deploy` เอาเฉพาะ dependency production รันด้วย user ที่ไม่ใช่ root entrypoint รัน `prisma migrate deploy` แล้วจึง `node dist/main` มี `HEALTHCHECK` ที่ `/api/health` และ `.dockerignore` ที่ root ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-24-dokploy-deploy/spec.md`

**Blocked by:** 01

**Status:** done

- [x] build image ได้ในเครื่อง และขนาด image อยู่ในระดับร้อย MB ไม่ใช่หลาย GB
- [x] รันกับ Postgres ในเครื่อง: migration รันเอง, health เป็น healthy, login ได้ผ่าน API
- [x] รัน seed ครั้งแรกใน container ได้ด้วยคำสั่งเดียว (ส่ง `ADMIN_*` เฉพาะตอนรัน)
- [x] ใน image ไม่มี `.env`, source `.ts` และ dev dependency

## Comments

- image 600 MB ส่วนใหญ่เป็น `prisma` CLI และ dependency ของมัน (studio, pglite, typescript ราว 200 MB) ที่ต้องมีเพื่อรัน migration ตอน start บน VPS ต้องลบ image เวอร์ชันเก่าเป็นระยะ (disk เหลือ 13 GB)
- ติดตั้ง `openssl` ใน image เพราะ schema engine ของ Prisma ต้องใช้ และ `bookworm-slim` ไม่มีมาให้
- build stage ตั้ง `DATABASE_URL` ปลอมไว้ให้ `prisma generate` อ่าน config ได้ ไม่ไปถึง image ที่ใช้รัน
- ทดสอบกับ DB ใหม่: migration 10 ตัวรันเองตอน start และ health ขึ้น `healthy`, restart แล้วได้ "No pending migrations to apply", `node dist/scripts/seed.js` (ส่ง `ADMIN_*` ผ่าน `docker exec -e`) สร้างบ้าน 164 หลังและหมวด 2 หมวด, login ได้ 201 และ Origin อื่นได้ 403, unlock ใช้ได้, RAM 152 MB จาก limit 384 MB
- ใน image ไม่มี `.env`, source `.ts` และ dev dependency ระดับบนสุด รันเป็น user `node`
