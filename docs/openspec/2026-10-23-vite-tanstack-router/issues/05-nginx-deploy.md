# 05: nginx ตัวอย่างและขั้นตอน deploy บน VPS

**What to build:** `deploy/nginx/spk-r5-parking-log.conf.example` เป็น virtual host หนึ่งโดเมน มี placeholder `server_name`, `root` และ backend port ทำ SPA fallback (`try_files $uri /index.html`) proxy `/api` ส่ง `X-Forwarded-For` redirect HTTP ไป HTTPS มี security header และ cache ตาม spec README อธิบายขั้นตอน build, copy `dist/`, certbot, การตั้งหลายโดเมนบน VPS เดียว และค่า `FRONTEND_URL`/`TRUST_PROXY_HOPS=1` ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-23-vite-tanstack-router/spec.md`

**Blocked by:** 02, 03

**Status:** ready-for-agent

- [ ] CSP: `default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; style-src 'self' 'unsafe-inline'`
- [ ] ตรวจ CSP กับ build จริง (`vite preview` ใส่ header เดียวกัน) ว่าไม่มี violation ใน console
- [ ] `nginx -t` ผ่านกับไฟล์ตัวอย่าง (ถ้ามี nginx ในเครื่อง หรือใช้ container)
- [ ] อัปเดต `apps/frontend/AGENTS.md` ที่ยังบอกว่าเป็น Next.js
