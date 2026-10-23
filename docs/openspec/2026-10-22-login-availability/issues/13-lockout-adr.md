# 13: ADR 0001 การออกแบบ lockout

**What to build:** เขียน `docs/adr/0001-login-lockout.md` บันทึกการตัดสินใจ Q1–Q17 ใน 05 โดยเฉพาะเหตุผลที่ไม่ตัดจบบัญชีที่ล็อกก่อน argon2 และไม่เพิ่ม cap เพราะ libuv threadpool (`UV_THREADPOOL_SIZE`) จำกัด memory ของ argon2 อยู่แล้ว ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-22-login-availability/spec.md` และคำตอบใน `05-lockout-redesign.md`

**Blocked by:** none

**Status:** done

- [x] ADR ตาม format ใน `docs/agents/domain.md`
