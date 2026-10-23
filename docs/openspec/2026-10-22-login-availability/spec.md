# Spec: ความทนทานของ login และ credential

Status: done
Started: 2026-10-22
Done: 2026-10-23

## Problem Statement

security audit รอบ quick (source-only) วันที่ 2026-10-21 ที่ commit `dbe7f4e` ไม่เจอช่องโหว่ที่ข้าม trust boundary แต่มีข้อ hardening รอบ login และ credential ดังนี้

- lockout ผูกกับ user id อย่างเดียว คนที่รู้ username (รวม ADMIN ที่มีอยู่คนเดียว) ส่งรหัสผิด 5 ครั้งทุก 15 นาทีก็ล็อกบัญชีนั้นค้างไว้ได้
- login แบบ anonymous ทุกครั้งรัน argon2id (m=64 MiB, t=3, p=4) ก่อนเช็ก lock รวมถึง user ที่ไม่มีอยู่และ user ที่ถูกล็อกอยู่แล้ว ตัวกันมีแค่ throttle `auth` 10 ครั้งต่อนาทีต่อ IP ที่เก็บใน memory
- `POST /api/auth/change-password` เช็ก `currentPassword` โดยมีแค่ throttle default 120 ครั้งต่อนาที คนที่ขโมย session ได้จึงเดารหัสผ่านผ่าน endpoint นี้ได้
- `changePassword` ยอมให้รหัสใหม่ซ้ำกับรหัสปัจจุบัน ผู้ใช้จึงเคลียร์ `mustChangePassword` ได้ทั้งที่ยังใช้รหัสชั่วคราวที่ admin ตั้งให้
- refresh cookie ที่ session id ไม่ใช่ UUID น่าจะไปถึง Prisma lookup บน `@db.Uuid` แล้วได้ 500 แทน 401
- `requireAuthEnvironment` ยอมให้ `JWT_ACCESS_SECRET` กับ `AUTH_TOKEN_PEPPER` เป็นค่าเดียวกัน

## Solution

แบ่งเป็นสองส่วน

- ข้อที่แก้ได้ทันทีโดยไม่ต้องตัดสินใจเรื่องออกแบบ (issue 01–04) ทำใน backend อย่างเดียว ทุกข้อเขียน test ก่อนแก้
- การออกแบบ lockout และการลดงาน argon2 ก่อนยืนยันตัวตน (issue 05) ต้องคุยให้ได้ข้อสรุปด้วย `/grill-me` ก่อน แล้วค่อยแตกเป็น issue ใหม่

ถ้าข้อสรุปของ 05 ต้องมี UI ใหม่ (เช่นปุ่มปลดล็อกในหน้า users) ให้ทำ UI หลังย้าย frontend ไป Vite + TanStack Router

## Out of Scope

- header ความปลอดภัย, `__Host-` cookie prefix, `COOKIE_SECURE` นอก production และการตั้ง `TRUST_PROXY_HOPS` เพราะขึ้นกับการ deploy
- Postgres ใน `compose.yaml` และ hardening ข้ออื่นใน report

## Source

report ของ audit อยู่นอก repo ที่ `~/security-audit-skill/spk-r5-parking-log/run-1/REPORT.th.md` §6 ข้อ 1–5
