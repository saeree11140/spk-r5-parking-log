# Spec: Backup ฐานข้อมูล production

Status: done
Started: 2026-10-25
Done: 2026-10-25

## Problem Statement

ระบบขึ้น production ที่ `https://parking.spkr5.com` แล้ว (task `2026-10-24-dokploy-deploy`) แต่ฐานข้อมูล Postgres ยังไม่มี backup เลย Hostatom ไม่มี snapshot ถ้า VPS พังหรือมีคนลบข้อมูลผิด ข้อมูลหายทั้งหมด

## Solution

- **นอกเครื่อง:** ใช้ระบบ backup ของ Dokploy (`pg_dump -Fc | gzip` ส่งด้วย `rclone rcat` ไม่มีสำเนาบนเครื่อง) ไปที่ Backblaze B2 (bucket `spk-r5-backup-k7q2`, region `us-east-005`; ตั้งใจเลือก US West แต่บัญชีได้ US East ซึ่งใช้ได้เหมือนกัน) ทุกวัน 02:00 เวลาไทย (`0 19 * * *` UTC) ไม่ตั้ง keep latest ใน Dokploy (key ลบไฟล์ไม่ได้)
- **bucket:** private, key `dokploy-spk-r5-nodelete` สร้างด้วย `b2 key create` ให้มีแค่ `listBuckets,listFiles,readFiles,writeFiles` อัปโหลด, Test (`rclone ls`) และ restore ได้ แต่ลบไฟล์หรือแก้กฎ bucket ไม่ได้ คนที่เจาะ VPS ได้จึงลบ backup ไม่ได้ การลบไฟล์เก่าให้ B2 ทำด้วย lifecycle แบบ custom: ซ่อนเมื่ออายุ 30 วัน ลบจริงหลังซ่อน 30 วัน (ย้อนหลังได้ 30–60 วัน)
- **บน VPS:** cron `30 2 * * *` (02:30 เวลาไทย เครื่องตั้ง timezone `Asia/Bangkok` แล้ว) รัน `pg_dump -Fc` ลง `/var/backups/spk-r5/` สิทธิ์ `600` ลบไฟล์เก่ากว่า 7 วัน ไม่มีแจ้งเตือน
- **แจ้งเตือน:** Dokploy ส่งอีเมลทั้งตอนสำเร็จและล้ม ผ่าน Gmail SMTP ด้วย App Password จาก `rtclub11140@gmail.com` ถึงตัวเอง ใช้ Gmail filter ติด label `spk-r5-backup` วันไหนไม่มีอีเมลแปลว่ามีปัญหา
- **ทดสอบ restore:** restore ลงฐานข้อมูลทดลองบน VPS (ไม่แตะ prod) แล้วนับแถวเทียบกับ prod ทำครั้งแรกหลังตั้งเสร็จ และซ้อมทุก 3 เดือนทั้งไฟล์จาก B2 และจาก VPS
- **เอกสาร:** หัวข้อ backup, restore, กู้ระบบเมื่อ VPS หายทั้งเครื่อง และดูฐานข้อมูลด้วย DBeaver ผ่าน `db-tunnel` ใน `docs/deploy/dokploy.md`

## Considered Options

- **key แบบ Read and Write จากหน้าเว็บ B2 + Dokploy เก็บ 30 ไฟล์ + lifecycle "keep prior versions 30 days":** ไม่ใช้ key จากหน้าเว็บมี `deleteFiles` และ `writeBucketLifecycleRules` ลบเวอร์ชันที่ซ่อนและแก้กฎได้ lifecycle จึงกันไม่ได้

- **Cloudflare R2:** ไม่เลือก ต้องผูกบัตรเครดิตก่อนเปิดใช้
- **แจ้งเตือนทาง Telegram:** ไม่เลือก ใช้อีเมล
- **เข้ารหัสไฟล์ก่อนส่ง:** ไม่ทำ Dokploy ไม่รองรับ B2 เข้ารหัสไฟล์ที่เก็บให้แล้ว

## Out of Scope

- backup ของ volume อื่นและของ Dokploy เอง (ตั้งค่า Dokploy สร้างใหม่ตามเอกสารได้)
