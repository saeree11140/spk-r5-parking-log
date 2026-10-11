# 02: นับและเปิดรอบแยกตามหมวด

**What to build:** ทุก violation ต้องอยู่ในหมวดใดหมวดหนึ่ง การนับครั้ง ค่าปรับ และการปิดรอบแยกตาม บ้าน + หมวด เช่น บ้านที่จอดรถผิด 1 ครั้งและปล่อยสัตว์เลี้ยงขับถ่ายแล้วไม่เก็บ 1 ครั้ง ได้แจ้งเตือนทั้งสองหมวด ไม่โดนปรับ

staff ต้องเลือกหมวดทุกครั้งที่บันทึก violation ส่วนหน้าบ้านแสดงรอบปัจจุบันแยกตามหมวด

ticket นี้ต้องแก้ backend กับ frontend พร้อมกัน เพราะ `HouseSummary.currentCycle` เปลี่ยนเป็น `currentCycles` ซึ่งเป็น breaking change ดูรายละเอียดใน spec ที่ `.scratch/violation-categories/spec.md`

**Blocked by:** 01 (กติกาค่าปรับ V2 พร้อมเก็บเวอร์ชันไว้ที่รอบ)

**Status:** done

- [x] มีตาราง violation category (name ห้ามซ้ำแบบไม่สนตัวพิมพ์และช่องว่างหัวท้าย บังคับที่ระดับ DB, isActive)
- [x] migration และ seed สร้างหมวด "จอดรถผิดระเบียบ" กับ "ปล่อยสัตว์เลี้ยงขับถ่ายในพื้นที่ส่วนกลางแล้วไม่เก็บ" seed รันซ้ำได้โดยไม่สร้างหมวดซ้ำ
- [x] รอบมี `categoryId` และ backfill รอบเดิมทั้งหมดเป็นหมวดจอดรถ
- [x] unique key ของรอบเป็น (house, category, cycleNumber) และมีรอบ OPEN ได้ไม่เกิน 1 รอบต่อ (house, category)
- [x] create violation บังคับส่ง `categoryId` ถ้าไม่ส่งได้ 400 ถ้าหมวดไม่มีอยู่ได้ 404 `CATEGORY_NOT_FOUND`
- [x] update violation ที่ส่ง `categoryId` มาได้ 400
- [x] การเช็ค backdate ก่อนรอบที่ปิดแล้ว และการ resequence ทำภายในรอบของหมวดนั้นเท่านั้น
- [x] การจ่ายค่าปรับครบปิดเฉพาะรอบของหมวดนั้น
- [x] e2e: หมวดจอดรถ 1 ครั้งกับหมวดสัตว์เลี้ยง 1 ครั้ง ได้แจ้งเตือนทั้งคู่
- [x] e2e: หมวดจอดรถครั้งที่ 2 ได้ 1000 และหมวดสัตว์เลี้ยงไม่เปลี่ยน
- [x] e2e: ปิดรอบหมวดจอดรถแล้ว รอบหมวดสัตว์เลี้ยงยัง OPEN และยังบันทึกย้อนหลังในหมวดสัตว์เลี้ยงได้
- [x] shared types:
  - `CycleSummary` และ `CycleResponse` มี category (id, name, isActive)
  - `HouseSummary` ใช้ `currentCycles` แทน `currentCycle`
  - `CreateViolationInput` มี `categoryId`
- [x] house list ดึงรอบ OPEN ของทุกหมวดในครั้งเดียว ไม่เกิด N+1 ต่อบ้าน
- [x] มี endpoint list หมวดแบบอ่านอย่างเดียว ให้ dropdown ใช้ (create, rename, activate และ deactivate อยู่ใน ticket 03)
- [x] create violation modal มี select หมวดแบบบังคับ ไม่มีค่า default แสดงเฉพาะหมวด active มี component test
- [x] edit violation modal แสดงหมวดแบบอ่านอย่างเดียว
- [x] หน้าบ้านจัดกลุ่มรอบปัจจุบันตามหมวด แต่ละหมวดมีแถวเลขครั้งและสีของตัวเอง ประวัติรอบแสดงชื่อหมวด มี component test
- [x] dashboard ทำงานกับ `currentCycles` โดยรวมยอดทุกหมวด และ metrics ไม่ผิดไปจากเดิมสำหรับข้อมูลที่มีหมวดเดียว
- [x] business rules doc แก้ให้บอกว่านับแยกตามหมวด

## Comments

- The detail API and the house page now list cycles newest `openedAt` first, because cycle numbers are counted per category and cannot be compared across categories.
- The create modal shows a retry button when loading categories fails.
- Rejecting violations in an inactive category (`CATEGORY_INACTIVE`) is left to ticket 03.
