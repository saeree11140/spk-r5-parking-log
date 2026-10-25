# 03: ตั้ง backup ของ Dokploy ไปที่ B2

**What to build:** เพิ่ม S3 destination ของ B2 ใน Dokploy แล้วตั้ง backup ของ `spk-r5-db` ทุกวัน `0 19 * * *` (UTC) ไม่ตั้ง keep latest (key ลบไฟล์ไม่ได้ B2 lifecycle ลบให้)

**Blocked by:** 01, 02

**Status:** done

- [x] กด Test ของ destination ผ่าน
- [x] backup แบบ manual ได้ไฟล์ใน bucket (อีเมลทดสอบใน issue 02)

## Comments

- 2026-10-25: destination `b2-spk-r5` (Provider Other, region `us-east-005`, endpoint `https://s3.us-east-005.backblazeb2.com`) ใช้ key `dokploy-spk-r5-nodelete` Test ผ่าน backup `0 19 * * *` prefix `daily/` Keep Latest ว่าง รันเองครั้งแรกได้ไฟล์ 12.3 KB ที่ `spkr5parkinglog-spkr5db-cclaxl/daily/` (Dokploy ใส่ชื่อ service เป็นโฟลเดอร์ชั้นแรกเอง)
- ครั้งแรกใส่ Master key ใน destination ได้ `InvalidAccessKeyId: Malformed Access Key Id` เพราะ B2 S3 API ไม่รับ Master key และ Dokploy ใส่ secret ไว้ในข้อความ error ห้ามวาง error ทั้งก้อน
- ฟอร์ม Create Backup: เลือก Destination แล้วช่องยังแสดง "Select Destination" แต่ค่าถูกเลือกแล้ว กด Create ได้
