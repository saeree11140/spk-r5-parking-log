# 03: ตั้งค่า Dokploy และ GitHub

**What to build:** เปิด Autodeploy ของ `spk-r5-backend` และ `spk-r5-frontend` คัดลอก Webhook URL ไปเป็น secret ใน GitHub Environment `production` แล้ว push `main` ให้ deploy ครั้งแรก

**Blocked by:** 02

**Status:** ready-for-human

- [ ] run แรกบน `main` deploy ทั้งสอง service และ version ใน prod ตรงกับ commit
- [ ] push ที่แก้แค่ `docs/` ไม่ deploy
