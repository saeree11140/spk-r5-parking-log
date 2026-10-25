# Spec: Deploy อัตโนมัติหลัง CI ผ่าน

Status: done
Started: 2026-10-25
Done: 2026-10-25

## Problem Statement

ทุกครั้งที่ merge เข้า `main` ต้องรอ CI แล้วเข้า Dokploy กด Deploy backend และ frontend เอง ลืมกดหรือกดผิดลำดับได้ และไม่มีอะไรบอกว่า prod รันเวอร์ชันไหน

## Solution

- **version ใน image:** CI ส่ง commit SHA เป็น build arg `APP_VERSION` backend ตอบใน `/api/health` (`"version"`) frontend เสิร์ฟ `/version.txt` ไม่ได้ส่งค่าเป็น `dev`
- **job `deploy`** ใน `.github/workflows/ci.yml` ต่อจาก `images` เฉพาะ push `main` ใช้ GitHub Environment `production` (ไม่มี reviewer) เก็บ secret `DOKPLOY_BACKEND_WEBHOOK` และ `DOKPLOY_FRONTEND_WEBHOOK` (Webhook URL ของแต่ละ service ใน Dokploy มี token อยู่ในตัว)
- **deploy เฉพาะที่เปลี่ยน:** เทียบ version ที่ prod รันอยู่ (อ่านจาก `/api/health` และ `/version.txt`) กับ commit ปัจจุบันด้วย `git diff` ตาม path ของแต่ละ service (`apps/<service>`, `packages/shared-types`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.dockerignore`) อ่าน version ไม่ได้หรือ commit ไม่มีใน history ให้ deploy เทียบกับ prod แทน commit ก่อนหน้า run ที่ถูกยกเลิกกลางทางจึงไม่ทำให้พลาด
- **ลำดับ:** backend ก่อน รอจน `/api/health` ตอบ version ตรง แล้วจึง frontend รอจน `/version.txt` ตรง แต่ละตัวรอนานสุด 5 นาที ไม่ตรงหรือ webhook ไม่ได้ 200 job ล้ม GitHub ส่งอีเมล
- Dokploy: เปิด Autodeploy ของทั้งสอง service (ปิดแล้ว webhook ได้ 400)

## Considered Options

- **ยิงพร้อมกัน:** ไม่เลือก frontend ใหม่อาจขึ้นก่อน backend
- **เช็กแค่ health 200:** ไม่พอ ตัวเก่ายังตอบ 200 ตอนยิง webhook
- **เทียบกับ commit ก่อนหน้า (`github.event.before`):** ไม่เลือก ถ้า run ก่อนถูกยกเลิกหลัง backend แต่ก่อน frontend การเปลี่ยนของ frontend จะหลุด
- **reviewer ก่อน deploy:** ไม่ตั้ง merge เข้า `main` คือการอนุมัติ เพิ่มภายหลังได้
