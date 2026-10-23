# 01: กติกาค่าปรับ V2 พร้อมเก็บเวอร์ชันไว้ที่รอบ

**What to build:** รอบที่เปิดหลัง deploy ใช้กติกาค่าปรับใหม่ (V2):

- ครั้งที่ 1: แจ้งเตือน
- ครั้งที่ 2: ปรับ 1,000 บาท
- ครั้งที่ 3 เป็นต้นไป: ปรับครั้งละ 500 บาท

รอบที่มีอยู่ก่อน deploy ใช้กติกาเดิม (V1) ต่อไปจนปิดรอบ คือแจ้งเตือน 2 ครั้ง ครั้งที่ 3 ปรับ 1,000 บาท และครั้งที่ 4 เป็นต้นไปปรับครั้งละ 500 บาท

หน้าบ้านแสดงว่าแต่ละรอบใช้กติกาไหน ticket นี้ยังไม่มีหมวด ดูรายละเอียดใน spec ที่ `docs/openspec/2026-10-11-violation-categories/spec.md`

**Blocked by:** None (can start immediately)

**Status:** done

- [x] รอบมี `fineRuleVersion` (V1 / V2) migration ตั้งรอบที่มีอยู่ทุกรอบ (OPEN และ CLOSED) เป็น V1 และไม่คำนวณค่าปรับหรือ resequence รอบเดิม
- [x] รอบที่สร้างใหม่ตั้งเป็น V2 เสมอ ไม่สนว่า `occurredAt` เป็นวันไหน
- [x] กติกาค่าปรับ (pure function) รับเวอร์ชันกับลำดับครั้ง unit test แบบ table-driven ครอบคลุม V1 และ V2 ลำดับครั้ง 1 ถึง 5
- [x] การสร้าง ยกเลิก และแก้ไข violation รวมถึง resequence คำนวณค่าปรับตามเวอร์ชันของรอบนั้น
- [x] e2e: บ้านที่ไม่มีรอบเปิด บันทึก 3 ครั้ง ได้ค่าปรับ 0 / 1000 / 500
- [x] e2e: รอบ V1 ที่มีแจ้งเตือน 2 ครั้ง บันทึกครั้งที่ 3 ได้ 1000 จากนั้นยกเลิกครั้งที่ 2 แล้วการ resequence ยังคิดแบบ V1
- [x] e2e: จ่ายค่าปรับรอบ V1 ครบแล้วรอบปิด violation ถัดไปเปิดรอบใหม่เป็น V2
- [x] `CycleResponse` และ `CycleSummary` มี `fineRuleVersion` ใน shared types
- [x] หน้าบ้านแสดงป้ายกติกาของแต่ละรอบ เช่น "กติกาเดิม: แจ้งเตือน 2 ครั้ง" และ "กติกาใหม่: แจ้งเตือน 1 ครั้ง" มี component test
- [x] business rules doc แก้ให้ตรงกับกติกา V2 และบอกว่ารอบเก่ายังใช้ V1

## Comments

- Implemented with TDD at the agreed seams. After code review, the migration was changed so that OPEN cycles with no active violations start on V2: they have no history to grandfather, and they would otherwise stay on V1 indefinitely.
- Found a pre-existing bug: Postgres serialization failure `40001` at commit time comes back as `DriverAdapterError` (`TransactionWriteConflict`), not `P2034`. `runSerializable` therefore does not retry it, and the API answers 500. Seen in `AuthService.login` when the e2e suites run in parallel. Not fixed in this ticket.
