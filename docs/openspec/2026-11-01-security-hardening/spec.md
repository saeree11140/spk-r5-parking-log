# Spec: เก็บ hardening ที่ค้างจาก audit run-1 และ dependency ที่มีช่องโหว่

Status: in-progress
Started: 2026-11-01

## Problem Statement

security audit รอบ quick (source-only) run-2 วันที่ 2026-11-01 ที่ commit `1d5ff8c` ไม่เจอช่องโหว่ที่ยืนยันได้ แต่ hardening จาก run-1 ยังค้าง 10 ข้อ (แก้บางส่วน 4 ข้อ ยังไม่แก้ 6 ข้อ) และ `pnpm audit --prod` เจอ advisory ใน dependency ที่ backend รันจริง

- `proxy-addr` 2.0.7 (critical, IP spoofing ผ่าน IPv4-mapped IPv6), `body-parser` 2.3.0 (high, DoS), `qs` 6.15.3 (moderate) มาทาง Express ทั้งหมด
- Postgres ใน `compose.yaml` publish ทุก interface
- `.gitignore` ไม่ครอบ `.env.*`, `*.key`, `*.p12`, `credentials*.json`, `*.dump` และ `prettier` เป็น `latest`
- ชื่อหมวดหลัง NFKC ยาวเกิน `VARCHAR(400)` ได้ ได้ 500 แทน 400
- กันการย้อนเวลา (backdate) ข้าม cycle ก่อนหน้าเฉพาะตอนเปิด cycle ใหม่
- `House.isActive` เช็กเฉพาะตอนสร้าง violation
- ลด role ADMIN ไม่ revoke session และไม่มี audit action ของตัวเอง
- `actorLabel` ใน audit log เก็บ `displayName` ที่แก้ได้
- cookie ไม่มี prefix `__Host-`/`__Secure-` และ response ของ API ที่ผ่าน Traefik ไม่มี security header
- production ยอมให้ `TRUST_PROXY_HOPS=0`
- lockout: argon2 รันก่อนเช็ก lock และเพดานทั้งบัญชีถูกใช้ล็อกเจ้าของซ้ำได้ (lead ข้อ 1 ของ run-2) ส่วนระหว่างล็อก ระบบยังเช็กรหัสผ่านอยู่ และตอบ 423 เมื่อรหัสถูก (ช่องว่างที่ run-2 ยังไม่ได้ตรวจ)

## Solution

ไล่ทีละ issue ตามลำดับ ทุกข้อเขียน test ก่อนแก้ถ้าเป็นโค้ด แต่ละ issue เป็นหนึ่ง commit

- 01–04 แก้ได้ทันที ไม่ต้องตัดสินใจเรื่องออกแบบ
- 05–11 ต้องตัดสินใจเรื่องพฤติกรรมก่อน ให้คุยกันจนได้ข้อสรุปก่อนลงมือ แล้วบันทึกข้อสรุปไว้ใน `## Comments` ของ issue

## Out of Scope

- hardening ใหม่ของ run-2 ที่ไม่ได้อยู่ในรายการ run-1 (CI pinning, digest-based deploy, B2 Object Lock, DB role แยก ฯลฯ)
- dependency ที่อยู่แค่ใน dev/test (`handlebars`, `undici`, `brace-expansion` ฯลฯ) และ dependency ฝั่ง frontend/Prisma CLI ที่ไม่ได้รันใน request path

## Source

report ของ audit อยู่นอก repo ที่ `~/security-audit-skill/spk-r5-parking-log/run-2/REPORT.th.md` และ `run-1/REPORT.th.md` §6
