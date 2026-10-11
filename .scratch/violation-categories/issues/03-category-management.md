# 03: หน้าจัดการหมวด

**What to build:** `ADMIN` และ `STAFF` เพิ่ม เปลี่ยนชื่อ ปิดใช้งาน และเปิดใช้งานหมวดการกระทำผิดได้จากหน้าจัดการหมวดในเมนูหลัก ไม่มีการลบ หมวดที่ปิดใช้งานแล้วเลือกตอนบันทึก violation ใหม่ไม่ได้ แต่ violation ในรอบที่ยังเปิดของหมวดนั้นยังจ่าย ยกเลิก และแก้ไขได้ตามปกติ ทุกการกระทำบันทึก audit log ดูรายละเอียดใน spec ที่ `.scratch/violation-categories/spec.md`

**Blocked by:** 02 (นับและเปิดรอบแยกตามหมวด)

**Status:** ready-for-agent

- [ ] API create, rename, activate และ deactivate ใช้ได้ทั้ง `ADMIN` และ `STAFF` และต้องผ่าน CSRF และ Origin validation
- [ ] ชื่อว่าง หรือยาวเกิน 100 ตัวอักษรได้ 400
- [ ] ชื่อซ้ำ (ต่างตัวพิมพ์หรือมีช่องว่างหัวท้าย) ได้ 409 `CATEGORY_NAME_TAKEN`
- [ ] เลือกพฤติกรรมตอน activate หรือ deactivate ซ้ำกับสถานะเดิมแบบเดียว (สำเร็จโดยไม่เปลี่ยนอะไร หรือ 409) และมี e2e test
- [ ] audit log entity `ViolationCategory` ใช้ action `CREATE`, `UPDATE`, `ACTIVATE` และ `DEACTIVATE` before/after เก็บ name กับ isActive และบันทึกชื่อคนทำ
- [ ] e2e: สร้าง violation ในหมวด inactive ได้ 409 `CATEGORY_INACTIVE`
- [ ] e2e: จ่ายและยกเลิก violation ในรอบ OPEN ของหมวด inactive ได้
- [ ] e2e: เปลี่ยนชื่อหมวดแล้ว ประวัติของบ้านแสดงชื่อใหม่
- [ ] หน้าจัดการหมวดอยู่ในเมนูหลักของทั้งสอง role แสดงตารางชื่อและสถานะ มีปุ่มเพิ่ม เปลี่ยนชื่อ ปิดใช้งาน และเปิดใช้งาน ปิดใช้งานต้องมี confirm dialog
- [ ] หน้าจัดการหมวดใช้ modal และ form pattern เดียวกับหน้า users มี component test ครอบคลุมการแสดง error ชื่อซ้ำ
- [ ] business rules doc เพิ่มกติกาการจัดการหมวด
