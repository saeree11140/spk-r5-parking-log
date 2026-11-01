# 03: ปิดช่องใน .gitignore และ pin prettier

**What to build:** เพิ่ม `.env.*` (ยกเว้น `.env.example`), `*.key`, `*.p12`, `credentials*.json` และ `*.dump` ใน `.gitignore` แล้วเปลี่ยน `prettier: latest` ใน `package.json` เป็นช่วงของ version ที่ lockfile ใช้อยู่ ดูรายละเอียดใน spec ที่ `docs/openspec/2026-11-01-security-hardening/spec.md`

**Blocked by:** none

**Status:** ready-for-agent

- [ ] `git check-ignore` จับไฟล์ตัวอย่างได้ครบทุก pattern
- [ ] `.env.example` ยังถูก track
- [ ] lockfile ไม่เปลี่ยน version ของ prettier

## Comments
