# Spec: ย้าย frontend จาก Next.js ไป Vite + TanStack Router

Status: done
Started: 2026-10-23
Done: 2026-10-24

## Problem Statement

frontend เป็น SPA ล้วน (`output: "export"`) ไม่ได้ใช้ SSR หรือ server feature ของ Next.js เลย แต่ยังต้องลาก Next ทั้งก้อนมา กฎ auth กระจายอยู่ใน `AuthGate`, `users-page.tsx` และ `app-shell.tsx` โดยเทียบ pathname แล้ว `router.replace` ใน effect หน้าที่ต้อง redirect จึง render "กำลังตรวจสอบสิทธิ์" หนึ่งรอบก่อนเสมอ และ test ต้อง mock `next/navigation`

## Solution

- build เป็น static file (`dist/`) ด้วย Vite แล้ววางบน VPS ที่มี nginx
- VPS หนึ่งเครื่องมีได้หลายโปรเจกต์ แต่ละโดเมนเป็น virtual host ของตัวเอง ชี้ `root` ไป `dist/` ของโปรเจกต์ และ proxy `/api` ไป backend port ของโปรเจกต์นั้น frontend กับ API จึงอยู่ origin เดียว ซึ่ง CSRF แบบ double-submit ต้องการ
- deploy ที่ root ของโดเมน API default เป็น `/api` override ได้ด้วย `VITE_API_URL` dev ใช้ Vite proxy `/api` ไป `localhost:3001` และ port 3000
- TanStack Router แบบ file-based route ทั้ง 7 เป็นตัวส่งต่อไปยัง feature page เดิม
- กฎ auth อยู่ใน `beforeLoad`: root route รอ `/auth/me` ผ่าน `ensureSession()` layout `_authenticated` redirect ไป `/login` หรือ `/change-password` route `/users` เช็ก ADMIN
- `houseCode` ที่ไม่ตรง R5-001..164 แสดงหน้า "ไม่พบบ้าน"
- font ใช้ `@fontsource/ibm-plex-sans-thai` test ใช้ router จริงผ่าน `createMemoryHistory` lint ใช้ `typescript-eslint` + `eslint-plugin-react-hooks` + `@tanstack/eslint-plugin-router`
- nginx ตัวอย่างมี HTTPS (certbot) security header (HSTS, nosniff, Referrer-Policy, CSP) cache 1 ปีสำหรับ `/assets/*` และ `no-cache` สำหรับ `index.html`
- ทำทั้งหมดใน branch `feat/vite-tanstack-router`

## Out of Scope

- การรัน backend และ Postgres บน VPS (systemd/pm2/docker, `container_name` ใน `compose.yaml` ที่ชนกันเมื่อมีหลายโปรเจกต์, backup, migrate ตอน deploy) เปิดเป็น task ใหม่

## Definition of Done

ทุก issue ผ่าน `pnpm test`, `pnpm --filter frontend typecheck`, `pnpm --filter frontend lint` และ `pnpm --filter frontend build`
