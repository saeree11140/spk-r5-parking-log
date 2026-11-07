# 04: เช็กความยาวชื่อหมวดหลัง NFKC

**What to build:** `normalizeCategoryName` ใช้ NFKC ซึ่งขยายตัวอักษรบางตัว (เช่น U+FDFA) ได้ถึง 18 ตัว ชื่อ 100 ตัวอักษรจึงเกิน `normalized_name VARCHAR(400)` แล้ว Postgres ปฏิเสธ ทำให้ได้ 500 ให้ตรวจความยาวหลัง normalize แล้วตอบ 400 ดูรายละเอียดใน spec ที่ `docs/openspec/2026-11-01-security-hardening/spec.md`

**Blocked by:** none

**Status:** ready-for-agent

- [ ] unit test: ชื่อ 100 × U+FDFA ได้ 400
- [ ] create และ rename ใช้กฎเดียวกัน

## Comments
