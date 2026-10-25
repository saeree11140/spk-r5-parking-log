# 01: บัญชี Backblaze B2, bucket และ key

**What to build:** สมัคร B2 สร้าง bucket private ตั้ง lifecycle แบบ custom (ซ่อน 30 วัน ลบหลังซ่อน 30 วัน) และสร้าง application key ที่ใช้ได้กับ bucket นี้ bucket เดียวและลบไฟล์ไม่ได้ ดู spec ที่ `docs/openspec/2026-10-25-db-backup/spec.md`

**Blocked by:** none

**Status:** done

- [x] bucket เป็น private และตั้ง lifecycle
- [x] มี key ที่จำกัดเฉพาะ bucket นี้ เก็บ keyID และ applicationKey ไว้ในที่ปลอดภัย (ไม่ลง repo ไม่ส่งในแชต)
- [x] จด S3 endpoint และ region ของ bucket

## Comments

- 2026-10-25: bucket `spk-r5-backup-k7q2`, endpoint `https://s3.us-east-005.backblazeb2.com` (region `us-east-005`)
- key จากหน้าเว็บแบบ Read and Write ได้ `deleteFiles` และ `writeBucketLifecycleRules` มาด้วย จึงลบทิ้งแล้วสร้าง `dokploy-spk-r5-nodelete` ด้วย `b2 key create --bucket spk-r5-backup-k7q2 dokploy-spk-r5-nodelete listBuckets,listFiles,readFiles,writeFiles` แทน
- Master key หลุดในแชตตอนรัน `b2 account authorize` ต้อง Generate New Master Application Key และ `b2 account clear`
