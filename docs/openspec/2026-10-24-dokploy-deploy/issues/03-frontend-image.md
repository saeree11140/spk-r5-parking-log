# 03: Docker image ของ frontend

**What to build:** `apps/frontend/Dockerfile` build `dist/` ด้วย Vite แล้วใช้ `nginxinc/nginx-unprivileged` เสิร์ฟ พร้อม `nginx.conf` ที่ทำ SPA fallback, ใส่ security header กับ CSP และตั้ง cache แบบเดียวกับ `deploy/nginx/spk-r5-parking-log.conf.example` (ไม่ทำ TLS และไม่ proxy `/api` เพราะ Traefik ทำให้) ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-24-dokploy-deploy/spec.md`

**Blocked by:** none

**Status:** done

- [x] build image และรันได้ในเครื่อง
- [x] `/houses/R5-001` ได้ `index.html` แบบ `no-cache`, `/assets/*` cache 1 ปี, asset ที่ไม่มีได้ 404
- [x] ทุก response มี HSTS, nosniff, Referrer-Policy และ CSP
- [x] Playwright ผ่าน container ไม่มี CSP violation

## Comments

- image 54.9 MB รันเป็น uid 101 (ไม่ใช่ root) ใช้ RAM ราว 6.6 MB ตอนว่าง
- เพิ่ม `packageManager: pnpm@11.9.0` ที่ root ให้ build ใน Docker และ CI ได้ pnpm เวอร์ชันเดียวกับในเครื่อง และ `.dockerignore` ที่ root กัน `node_modules`, `.env` และ `.git` เข้า image
- `shared-types` ต้อง build ก่อน frontend เพราะ `exports.import` ชี้ไปที่ `dist/`
- ถ้ารัน container เดี่ยวๆ ไม่มี Traefik `/api/*` จะได้ `index.html` กลับไป ใน Dokploy Traefik ส่ง `/api` ไป backend ก่อนถึง container นี้
