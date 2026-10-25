# 04: backup บน VPS เก็บ 7 วัน

**What to build:** script ที่รัน `pg_dump -Fc` ใน container ของ `spk-r5-db` ลง `/var/backups/spk-r5/` (สิทธิ์ `600`) แล้วลบไฟล์เก่ากว่า 7 วัน ติดตั้งเป็น cron ของ root `30 2 * * *` (เวลาไทย)

**Blocked by:** none

**Status:** done

- [x] รันเองแล้วได้ไฟล์ขนาดไม่เป็นศูนย์
- [x] cron ติดตั้งแล้ว (ยังรอดูไฟล์จากรอบ cron แรก 2026-10-26 02:30)

## Comments

- 2026-10-25: script อยู่ที่ `deploy/backup/spk-r5-local-backup.sh` ทดสอบกับ Postgres 18 ใน Docker บน Mac (ลบไฟล์เก่า, สิทธิ์ 600, ไม่มี container แล้ว exit 1) แล้วติดตั้งบน VPS ผ่าน ssh รันครั้งแรกได้ไฟล์ 35533 bytes
- พบว่าเครื่องตั้ง timezone `Europe/Berlin` ไม่ใช่ UTC cron ของ `db-tunnel` ที่เขียนเป็น UTC จึงรันผิดเวลา เปลี่ยนเป็น `Asia/Bangkok` แล้วเขียน crontab ใหม่เป็นเวลาไทย: db-tunnel `0 7`/`0 0`, backup `30 2`
