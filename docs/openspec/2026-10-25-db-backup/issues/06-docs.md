# 06: เอกสาร backup, restore และการเข้าฐานข้อมูล

**What to build:** เพิ่มใน `docs/deploy/dokploy.md`: ตั้ง backup (B2, อีเมล, cron บน VPS), restore, กู้ระบบเมื่อ VPS หายทั้งเครื่อง, ซ้อม restore ทุก 3 เดือน และดูฐานข้อมูลด้วย DBeaver ผ่าน `db-tunnel` (cron สร้าง 07:00 ลบ 00:00 เวลาไทย เพราะ Dokploy cleanup 23:50 UTC ลบ container ที่หยุดอยู่)

**Blocked by:** 05

**Status:** done

- [x] ทำตามเอกสารแล้วได้ผลเดียวกับที่ทำจริง

## Comments

- 2026-10-25: เพิ่มใน `docs/deploy/dokploy.md` ข้อ 6 Backup, Restore (ซ้อม/กู้ prod), กู้ระบบเมื่อ VPS หาย, ดูฐานข้อมูลด้วย DBeaver และแก้หัวข้อลบ image เป็น Daily Docker Cleanup เพิ่ม `docs/deploy/vps-setup.md` ข้อ 7 timezone
