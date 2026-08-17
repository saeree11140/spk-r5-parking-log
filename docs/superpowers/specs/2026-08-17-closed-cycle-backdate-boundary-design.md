# Closed Cycle Backdate Boundary Design

## ปัญหา

เมื่อบ้านปิด Cycle หลังชำระ Fine ระบบใช้ `ViolationCycle.closedAt` เป็นเส้นแบ่งเวลาสำหรับ Violation ใน Cycle ใหม่ ทำให้เหตุที่เกิดหลัง Violation ล่าสุด แต่ถูกบันทึกก่อนเวลาชำระ Fine ถูกปฏิเสธด้วย `BACKDATE_NOT_ALLOWED`

ตัวอย่าง `R5-026`:

- Violation ล่าสุดใน Cycle 1: `2025-10-04 08:50:04 Asia/Bangkok`
- ชำระ Fine และปิด Cycle 1: `2026-08-17 08:51:29 Asia/Bangkok`
- Violation ใหม่: `2026-07-26 08:50:04 Asia/Bangkok`

Violation ใหม่เกิดหลัง Violation ล่าสุด จึงควรเริ่ม Cycle 2 ได้ แม้เกิดก่อนเวลาที่เจ้าหน้าที่บันทึกการชำระ

## การตัดสินใจ

เมื่อไม่มี Cycle เปิด ให้ Backend ใช้ `occurredAt` ของ Violation ที่ไม่ถูกยกเลิกล่าสุดใน Cycle ปิดล่าสุดเป็นเส้นแบ่ง แทน `closedAt`

- อนุญาตเมื่อ `occurredAt` เท่ากับหรือหลัง Violation ล่าสุด
- ปฏิเสธเมื่อ `occurredAt` ก่อน Violation ล่าสุด
- ไม่แก้ข้อมูล Cycle ปิดและ Violation เดิม
- Cycle ใหม่ใช้ `cycleNumber` ถัดไปและ `openedAt` เท่ากับ `occurredAt` ของรายการใหม่เหมือนเดิม
- `closedAt` ยังหมายถึงเวลาปิดรอบจากการชำระ และไม่ถูกเปลี่ยนความหมาย

## การเปลี่ยนแปลง Backend

ปรับ `ViolationsService.findOrCreateOpenCycle` ให้โหลด Violation ที่ไม่ถูกยกเลิกล่าสุดพร้อม Cycle ล่าสุด โดยเรียง `occurredAt`, `createdAt` และ `id` จากมากไปน้อย แล้วตรวจขอบเขตด้วยเวลาเกิดเหตุของรายการนั้น

ถ้า Cycle ล่าสุดไม่มี Violation ที่ไม่ถูกยกเลิก ให้สร้าง Cycle ใหม่ได้ เพราะไม่มีเวลาเกิดเหตุที่ใช้เป็นขอบเขต

Error contract คงเดิม:

- HTTP `409`
- code `BACKDATE_NOT_ALLOWED`
- message `Violation cannot be backdated before closed cycle`

## Data Flow

1. รับและ parse `occurredAt`
2. ล็อกธุรกรรมแบบ serializable ตาม flow เดิม
3. หา Cycle เปิด; ถ้ามี ใช้ Cycle เดิมและ validation เดิม
4. ถ้าไม่มี Cycle เปิด หา Cycle ล่าสุดพร้อม Violation ล่าสุด
5. ปฏิเสธเฉพาะเมื่อเวลาใหม่เก่ากว่า Violation ล่าสุด
6. สร้าง Cycle ใหม่และ Violation ตาม flow เดิม

## Testing

เพิ่ม regression tests ฝั่ง service:

- อนุญาต Violation หลัง Violation ล่าสุด แม้ก่อน `closedAt`
- ปฏิเสธ Violation ก่อน Violation ล่าสุด
- ยืนยัน query ไม่นับ Violation สถานะ `CANCELLED`

รัน unit tests ของ `ViolationsService`, backend test suite, lint และ build จากนั้นตรวจหน้า `R5-026` ว่าสามารถบันทึกวันที่ `26/07/2569 08:50:04` และสร้าง Cycle 2 ได้

## Non-goals

- ไม่เปลี่ยนกฎ Fine หรือการปิด Cycle
- ไม่แก้ Cycle เก่า
- ไม่เปลี่ยน UI หรือ shared API types
- ไม่ลบ backdate protection ทั้งหมด
