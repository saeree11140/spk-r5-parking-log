# SPK R5 Parking Log — Frontend

หน้า Admin สำหรับตรวจสอบบ้าน 164 หลัง บันทึกและยกเลิก Violation และปรับสถานะ Fine ว่าชำระแล้ว ระบบออกแบบให้ใช้งานบน Desktop เป็นหลักและรองรับ Mobile

## ความสามารถปัจจุบัน

- Dashboard สรุปจำนวนบ้าน, Violation, Fine รอชำระ และยอดค้าง
- ค้นหาบ้านและกรองตามสถานะ
- หน้ารายละเอียดบ้าน `R5-001` ถึง `R5-164`
- แสดง Cycle และประวัติ Violation ตามลำดับที่ Backend คำนวณ
- เพิ่มและยกเลิก Violation
- ปรับสถานะ Fine เป็นชำระแล้วแบบ Offline
- แสดงวันที่เวลาไทย เขตเวลา Asia/Bangkok และปีพุทธศักราช
- รองรับ Keyboard, Focus Management และ Reduced Motion

ระบบนี้ไม่รับชำระเงินจริง ไม่เชื่อม Payment Gateway และไม่มีช่องกรอกยอดเงิน

## Tech Stack

- Next.js App Router และ TypeScript
- TanStack Query และ Axios สำหรับ Server State/API
- React Hook Form และ Zod สำหรับ Form/Validation
- Zustand สำหรับ UI State ของ Dashboard
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
/houses/R5-001
...
/houses/R5-164
```

ผลลัพธ์อยู่ใน `apps/frontend/out` แต่ข้อมูลจริงยังโหลดจาก Backend API ตอนใช้งาน
