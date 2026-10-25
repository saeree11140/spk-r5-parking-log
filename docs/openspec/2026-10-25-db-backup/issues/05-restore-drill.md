# 05: ซ้อม restore

**What to build:** restore ไฟล์ล่าสุดจาก B2 และจาก VPS ลงฐานข้อมูลทดลองบน VPS (container ชั่วคราวที่ไม่แตะ prod) แล้วนับแถวของตารางหลักเทียบกับ prod

**Blocked by:** 03, 04

**Status:** done

- [x] ไฟล์จาก B2 restore ได้ จำนวนแถวตรง
- [x] ไฟล์จาก VPS restore ได้ จำนวนแถวตรง

## Comments

- 2026-10-25: ไฟล์บน VPS restore ลง container `postgres:18.4-alpine3.23` ชั่วคราวบน VPS ได้ ไฟล์จาก B2 (`2026-10-25T07-12-24-083Z.sql.gz`) ดาวน์โหลดมา restore บน Mac ได้ ทั้งสองได้ `_prisma_migrations=10 audit_logs=2 fines=0 houses=164 parking_violations=0 users=1 violation_categories=2` ตรงกับ prod
- ไฟล์จาก B2 เป็น `pg_dump -Fc` ที่ gzip อีกชั้น ต้อง `gunzip -c` ก่อน `pg_restore`
- ซ้อมครั้งถัดไป: 2027-01-25
