# 05: nginx ตัวอย่างและขั้นตอน deploy บน VPS

**What to build:** `deploy/nginx/spk-r5-parking-log.conf.example` เป็น virtual host หนึ่งโดเมน มี placeholder `server_name`, `root` และ backend port ทำ SPA fallback (`try_files $uri /index.html`) proxy `/api` ส่ง `X-Forwarded-For` redirect HTTP ไป HTTPS มี security header และ cache ตาม spec README อธิบายขั้นตอน build, copy `dist/`, certbot, การตั้งหลายโดเมนบน VPS เดียว และค่า `FRONTEND_URL`/`TRUST_PROXY_HOPS=1` ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-23-vite-tanstack-router/spec.md`

**Blocked by:** 02, 03

**Status:** done

- [x] CSP: `default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; style-src 'self' 'unsafe-inline'`
- [x] ตรวจ CSP กับ build จริง (`vite preview` ใส่ header เดียวกัน) ว่าไม่มี violation ใน console
- [x] `nginx -t` ผ่านกับไฟล์ตัวอย่าง (ถ้ามี nginx ในเครื่อง หรือใช้ container)
- [x] อัปเดต `apps/frontend/AGENTS.md` ที่ยังบอกว่าเป็น Next.js

## Comments

- ทดสอบกับ nginx จริงใน Docker (`nginx:stable`, cert self-signed): `nginx -t` ผ่าน, HTTP ได้ 301 ไป HTTPS, `/houses/R5-001` ได้ `index.html` แบบ `no-cache`, ไฟล์ใน `/assets/` cache 1 ปี, asset ที่ไม่มีได้ 404, `/api/health` proxy ถึง backend และทุก response มี HSTS, nosniff, Referrer-Policy และ CSP
- CSP ต้องมี `font-src 'self' data:` เพราะ Vite ฝัง font ของ `@fontsource` ที่เล็กกว่า 4 KB เป็น `data:font/woff2`
- ใช้ Playwright บน Chrome ผ่าน nginx กับ backend ที่ตั้ง `FRONTEND_URL=https://localhost:8443`, `TRUST_PROXY_HOPS=1`: login, dashboard, dialog บันทึก violation, date picker, หน้าผู้ใช้ + dialog สร้างผู้ใช้ และหน้า "ไม่พบบ้าน" ไม่มี CSP violation
- คง `listen 443 ssl http2` ไว้ (มี deprecation warning บน nginx ใหม่) เพราะ `http2 on;` ใช้ไม่ได้กับ nginx < 1.25.1 เช่น Ubuntu 24.04
