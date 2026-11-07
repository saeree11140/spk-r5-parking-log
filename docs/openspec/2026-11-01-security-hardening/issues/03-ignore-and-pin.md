# 03: ปิดช่องใน .gitignore และ pin prettier

**What to build:** เพิ่ม `.env.*` (ยกเว้น `.env.example`), `*.key`, `*.p12`, `credentials*.json` และ `*.dump` ใน `.gitignore` แล้วเปลี่ยน `prettier: latest` ใน `package.json` เป็นช่วงของ version ที่ lockfile ใช้อยู่ ดูรายละเอียดใน spec ที่ `docs/openspec/2026-11-01-security-hardening/spec.md`

**Blocked by:** none

**Status:** done

- [x] `git check-ignore` จับไฟล์ตัวอย่างได้ครบทุก pattern
- [x] `.env.example` ยังถูก track
- [x] lockfile ไม่เปลี่ยน version ของ prettier

## Comments

- 2026-11-01: `.gitignore` ใช้ `.env` + `.env.*` + `!.env.example` แทน `.env*.local` และเพิ่ม `*.key`, `*.p12`, `credentials*.json`, `*.dump` ตรวจด้วย `git check-ignore` แล้วจับได้ทั้ง `.env.production`, `apps/*/.env.local` และไฟล์ตัวอย่างของทุก pattern ส่วน `.env.example` ยังถูก track
- `prettier` เปลี่ยนเป็น `^3.9.10` ซึ่งเป็น version ที่ lockfile ใช้อยู่ lockfile เปลี่ยนแค่บรรทัด specifier
