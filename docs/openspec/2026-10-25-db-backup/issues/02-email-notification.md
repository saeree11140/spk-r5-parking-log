# 02: แจ้งเตือนทางอีเมลใน Dokploy

**What to build:** สร้าง Gmail App Password แล้วเพิ่ม notification แบบ Email ใน Dokploy (Gmail SMTP) ให้แจ้งเหตุการณ์ Database Backup ตั้ง Gmail filter ติด label `spk-r5-backup`

**Blocked by:** none

**Status:** done

- [x] กด Test ใน Dokploy แล้วได้อีเมล
- [x] เลือกเหตุการณ์ Database Backup

## Comments

- 2026-10-25: Notification แบบ Email (SMTP `smtp.gmail.com` port `587`, From/To `rtclub11140@gmail.com`, Gmail App Password `dokploy-spk-r5`) เปิด Database Backup และ Dokploy Restart Test ได้อีเมล "Test Email" และกด backup เองได้อีเมล "Database backup for dokploy" ว่าสำเร็จ
- ใส่รหัสผ่าน Gmail ปกติได้ `534-5.7.9 Application-specific password required` ต้องใช้ App Password (16 ตัว ไม่มีช่องว่าง) ช่อง SMTP Server ใส่แค่ host ไม่ต้องมี `:587`
- Gmail filter: Subject `Database backup` ติด label `spk-r5-backup`
