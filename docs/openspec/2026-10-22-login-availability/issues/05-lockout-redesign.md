# 05: ออกแบบ lockout และงาน argon2 ก่อนยืนยันตัวตนใหม่

**What to build:** ตัดสินใจรูปแบบ lockout และวิธีลดงาน argon2 ของ login แบบ anonymous ด้วย `/grill-me` แล้วแตกผลเป็น issue ใหม่ใน folder นี้ ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-22-login-availability/spec.md`

**Blocked by:** none

**Status:** resolved

คำถามที่ต้องได้ข้อสรุป

- [x] บัญชีที่ล็อกอยู่ ควรตอบกลับก่อนรัน argon2 ไหม และจะรักษาเวลาตอบให้เท่ากับกรณีอื่นอย่างไร ตอนนี้ lock เช็กหลัง `verify` (`apps/backend/src/auth/auth.service.ts:42-55`)
- [x] ควร cap จำนวน argon2 ที่รันพร้อมกันทั้ง process ไหม และเกิน cap แล้วตอบอะไร
- [x] lockout ควรผูกกับอะไร: user id อย่างเดียว (แบบเดิม), username + IP หรือเพิ่มเวลาล็อกเป็นขั้น
- [x] admin ควรปลดล็อกบัญชีได้ไหม ถ้าได้ต้องมี endpoint และ UI ใหม่ (UI ทำหลังย้ายไป Vite + TanStack Router)
- [x] การใส่ `currentPassword` ผิดใน change-password ควรนับเข้า lockout ไหม (ต่อจาก 01)

## Answer

grill วันที่ 2026-10-23 ได้ข้อสรุปดังนี้ และแตกเป็น issue 06–13

- Q1: ออกแบบโดยถือว่า login เปิดสู่ internet สาธารณะ
- Q2: รัน argon2 ทุกครั้งเหมือนเดิม ไม่ตัดจบบัญชีที่ล็อก เพราะประหยัดได้น้อยและเปิด timing oracle
- Q3: ไม่เพิ่ม cap ของ argon2 เพราะ `argon2` ใช้ `Napi::AsyncWorker` บน libuv threadpool (default 4) memory จึงจำกัดที่ประมาณ 4×64 MiB งานที่เกินเข้าคิว บันทึกใน ADR
- Q4: ไม่เพิ่ม endpoint unlock ใช้ admin reset-password ซึ่งล้าง lock อยู่แล้ว
- Q5: เพิ่ม CLI `auth:unlock <username>` สำหรับกรณี ADMIN คนเดียวถูกล็อก
- Q6, Q8: lockout ต่อ (user, IP) ผิด 5 ครั้งล็อก 15 นาที และเพดานรวมต่อ user ผิด 20 ครั้งใน 1 ชั่วโมงล็อกทั้งบัญชี 15 นาที
- Q7: audit `LOCK` ตอนล็อก และ `UNLOCK` จาก CLI actor `SYSTEM`
- Q9: counter ต่อ IP เก็บใน table `login_failures` เพดานรวมใช้ column บน `users` + `failed_window_started_at`
- Q10: ไม่นับ username ที่ไม่มีในระบบ
- Q11, Q17: change-password ผิด 5 ครั้งใน session เดียว revoke session นั้น ตอบ 401 `AUTH_REQUIRED` ไม่นับเข้า lockout ของ login
- Q12: production ต้องตั้ง `TRUST_PROXY_HOPS` เอง ไม่ตั้งแล้ว throw ตอน start
- Q13, Q16: รหัสถูกแต่ติดล็อกตอบ 423 `AUTH_ACCOUNT_LOCKED` ข้อความไม่บอกเวลา กรณีอื่นตอบ `AUTH_INVALID_CREDENTIALS`
- Q14: login สำเร็จล้างเฉพาะแถว (user, IP) เพดานรวมหมดเองตามหน้าต่าง
- Q15: admin reset-password และ CLI unlock ล้าง lock ทุกแบบของ user
