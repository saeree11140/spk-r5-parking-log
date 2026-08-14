# SPK R5 Parking Log — Frontend

หน้า Admin สำหรับตรวจสอบบ้าน 164 หลัง บันทึกและยกเลิก Violation และปรับสถานะ Fine ว่าชำระแล้ว ระบบออกแบบให้ใช้งานบน Desktop เป็นหลักและรองรับ Mobile

## ความสามารถปัจจุบัน

- Dashboard สรุปจำนวนบ้าน, Violation, Fine รอชำระ และยอดค้าง
- หน้ารายชื่อบ้าน `/houses` สำหรับค้นหาและกรองตามสถานะ
- หน้ารายละเอียดบ้าน `R5-001` ถึง `R5-164`
- แสดง Cycle และประวัติ Violation ตามลำดับที่ Backend คำนวณ
- เพิ่ม แก้ไข และยกเลิก Violation
- ปรับสถานะ Fine เป็นชำระแล้วแบบ Offline
- แสดงวันที่เวลาไทย เขตเวลา Asia/Bangkok และปีพุทธศักราช
- รองรับ Keyboard, Focus Management และ Reduced Motion
- Login และบังคับเปลี่ยนรหัสผ่านครั้งแรก
- Protected routes โดยไม่แสดงข้อมูลก่อนตรวจ Session
- ADMIN User Management; STAFF ไม่มีเมนูและเปิด `/users` ไม่ได้
- Access expiry ใช้ single-flight refresh แล้ว retry request เดิมหนึ่งครั้ง

ระบบนี้ไม่รับชำระเงินจริง ไม่เชื่อม Payment Gateway และไม่มีช่องกรอกยอดเงิน

## แก้ไข Violation

ในตารางประวัติของแต่ละ Cycle จะมีปุ่ม **แก้ไข** อยู่ก่อนปุ่ม **ยกเลิก** สำหรับ
Violation ที่ยังแก้ไขได้ ปุ่มนี้เปิดฟอร์มให้แก้ไขได้เฉพาะวันเวลาเกิดเหตุและหมายเหตุ;
วันเวลาต้องไม่อยู่ในอนาคต และหมายเหตุยาวได้ไม่เกิน 1,000 ตัวอักษร ล้างข้อความใน
หมายเหตุแล้วบันทึกเพื่อให้แสดง `—` ในตาราง

ปุ่มแก้ไขจะแสดงเฉพาะ Violation ที่ไม่ถูกยกเลิก อยู่ใน Cycle สถานะเปิด และ Cycle
นั้นยังไม่มี Fine ที่ชำระแล้ว หลังบันทึก Frontend จะโหลดข้อมูลบ้านใหม่เพื่อแสดง
ลำดับ สถานะ และ Fine ที่ Backend เรียงและคำนวณใหม่อัตโนมัติจากวันเวลาเกิดเหตุ

## Tech Stack

- Next.js App Router และ TypeScript
- TanStack Query และ Axios สำหรับ Server State/API
- React Hook Form และ Zod สำหรับ Form/Validation
- Zustand สำหรับ Auth/UI State โดยไม่เก็บ token
- date-fns สำหรับวันที่เวลา
- Lucide React สำหรับ Icon
- Vitest และ Testing Library สำหรับ Test

## Environment

สร้างไฟล์ `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

หากรัน Frontend ด้วย Port อื่น ต้องตั้ง `FRONTEND_URL` ของ Backend ให้ตรงกัน เช่น:

```bash
FRONTEND_URL=http://localhost:3100 pnpm dev:backend
```

## Development

จาก Root ของ Monorepo:

```bash
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev:backend
pnpm dev:frontend
```

เปิด `http://localhost:3000`

ADMIN จาก Seed ต้องเปลี่ยนรหัสผ่านหลัง Login ครั้งแรก จากนั้นใช้งาน Dashboard และหน้า `/users` ได้ Session มีอายุสูงสุด 8 ชั่วโมง ส่วน Access Token มีอายุ 15 นาทีและ refresh ผ่าน HttpOnly cookie อัตโนมัติ

หรือรัน Frontend แยก:

```bash
pnpm --filter frontend dev
```

## Quality Checks

```bash
pnpm --filter frontend test:run
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend build
```

## Static Routes

Build จะสร้าง Static HTML สำหรับ Dashboard และบ้านทั้ง 164 หลัง:

```text
/
/login
/change-password
/users
/houses
/houses/R5-001
...
/houses/R5-164
```

ผลลัพธ์อยู่ใน `apps/frontend/out` แต่ข้อมูลจริงยังโหลดจาก Backend API ตอนใช้งาน

Root metadata กำหนด `noindex, nofollow, nocache` เพื่อลดการถูก index แต่ค่านี้ไม่ใช่ security boundary สิทธิ์จริงตรวจที่ Backend API
