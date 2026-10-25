# 03: ตั้งค่า Dokploy และ GitHub

**What to build:** เปิด Autodeploy ของ `spk-r5-backend` และ `spk-r5-frontend` คัดลอก Webhook URL ไปเป็น secret ใน GitHub Environment `production` แล้ว push `main` ให้ deploy ครั้งแรก

**Blocked by:** 02

**Status:** done

- [x] run แรกบน `main` deploy ทั้งสอง service และ version ใน prod ตรงกับ commit
- [x] push ที่แก้แค่ `docs/` ไม่ deploy

## Comments

- 2026-10-25: Autodeploy เปิดทั้งสอง service, Environment `production` (ไม่มี reviewer, จำกัด branch `main`) มี secret `DOKPLOY_BACKEND_WEBHOOK` และ `DOKPLOY_FRONTEND_WEBHOOK` push `bbe725f` เข้า `main` แล้ว run #11 deploy ทั้งสอง service `/api/health` และ `/version.txt` ตอบ `bbe725fcde62abd3d8c81992d56e7685b781a6ab` (เวลา 15:09)
- ครั้งแรกสร้าง Environment ชื่อ `DOKPLOY_BACKEND_WEBHOOK` ผิด ต้องเป็น Environment `production` ที่มี secret สองตัว
- 2026-10-25: push `aa71474` (แก้แค่ `docs/`) job `deploy` สำเร็จ step Deploy backend และ Deploy frontend เป็น skipped prod ยังรัน `bbe725f` ทั้งสองตัว
