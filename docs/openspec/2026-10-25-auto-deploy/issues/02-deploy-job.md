# 02: job deploy ใน CI

**What to build:** job `deploy` ต่อจาก `images` (push `main`) เทียบ version ของ prod กับ HEAD ตาม path ยิง webhook backend แล้วรอ version ตรง แล้วจึง frontend

**Blocked by:** 01

**Status:** done

- [x] script ทดสอบในเครื่องกับ server จำลองได้ทั้งกรณีสำเร็จ หมดเวลา และ webhook ไม่ได้ 200

## Comments

- 2026-10-25: `deploy/ci/deployed-version.sh`, `needs-deploy.sh`, `dokploy-deploy.sh` ทดสอบกับ server จำลองแล้ว: สำเร็จ, webhook 400, หมดเวลา, หน้า SPA fallback และ server ที่เข้าไม่ได้ให้ค่าว่าง, `needs-deploy` ถูกทั้งกรณีมี/ไม่มี diff และ commit ที่ไม่มีใน history script ไม่พิมพ์ webhook URL
