# เอกสารออกแบบโครงสร้างเริ่มต้น Monorepo สำหรับ SPK R5 Parking Log

## เป้าหมาย

สร้าง pnpm workspace ที่ประกอบด้วย Next.js Frontend, NestJS Backend และ Package สำหรับ TypeScript Types ที่ใช้ร่วมกัน โดยแต่ละส่วนต้องรันและ Build แยกกันได้ งานขั้นนี้ไม่รวม Database, Prisma, Authentication, Docker และ Business Logic สำหรับการกระทำผิดเรื่องที่จอดรถ

## สถาปัตยกรรม

- Root Workspace ดูแลคำสั่งส่วนกลาง และครอบคลุม `apps/*` กับ `packages/*`
- `apps/frontend` เป็น Next.js App Router Application ใช้ TypeScript, Tailwind CSS, ESLint, `src` directory และ Static Export
- `apps/backend` เป็น NestJS Application ใช้ TypeScript Strict Mode, Global Prefix `/api`, CORS, Request Validation และ Port จาก Environment Variable
- `packages/shared-types` Compile Types ที่ Frontend และ Backend ใช้ร่วมกัน พร้อมสร้าง Type Declaration
- `docs/business-rules.md` บันทึกกฎทางธุรกิจ โดยยังไม่สร้าง Business Logic

## ส่วนประกอบ

### Frontend

มีหน้า System Check แบบ Responsive หน้าเดียว แสดงชื่อผลิตภัณฑ์ วัตถุประสงค์ และสถานะว่าระบบทำงานอยู่ ทิศทางภาพใช้สีน้ำเงินเข้มแบบพื้นถนน สีเหลืองนิรภัย สีขาวแบบเส้นจราจร และลายเส้นช่องจอดรถอย่างพอดี ใช้ System Font Stack เพื่อไม่ต้องโหลด Font ขณะ Runtime ไม่ใช้ Server Actions, API Routes, SSR, Dynamic Rendering หรือ Next.js Image Optimization

Frontend อ่านค่า `NEXT_PUBLIC_API_URL` แต่ในโครงสร้างเริ่มต้นนี้ยังไม่จำเป็นต้องเรียก API ขณะ Runtime ผลลัพธ์ Static Export อยู่ใน `out`

### Backend

Bootstrap ตั้งค่าดังนี้:

- Global Prefix เป็น `api`
- ใช้ `ValidationPipe` พร้อม Whitelist, Transform และปฏิเสธ Property ที่ไม่รู้จัก
- CORS อ่าน Origin จาก `FRONTEND_URL` และใช้ `http://localhost:3000` เป็นค่าเริ่มต้น
- Port อ่านจาก `BACKEND_PORT` และใช้ `3001` เป็นค่าเริ่มต้น

Health Module แยกความรับผิดชอบชัดเจน เปิด Endpoint `GET /api/health` และตอบกลับ:

```json
{
  "status": "ok",
  "service": "spk-r5-parking-log-api"
}
```

Return Type ของ Controller ใช้ `HealthCheckResponse` จาก Shared Types

### Shared Types

Package `@spk-r5-parking-log/shared-types` Export `ViolationStatus` และ `HealthCheckResponse` ผ่าน `src/index.ts` โดย TypeScript Build สร้าง JavaScript และ Type Declaration ไว้ใน `dist`

## คำสั่ง Workspace

Root Scripts ใช้รัน Development, Build, Lint และ Format ครบทุก Package ชื่อ Package ต้องเป็น `frontend`, `backend` และ `@spk-r5-parking-log/shared-types` เพื่อให้ Filter Commands ทำงานถูกต้อง

## การทดสอบและตรวจสอบ

- พัฒนา Health Endpoint แบบ Test-first ด้วย Controller Unit Test
- ตรวจ Generated Scaffold และ Configuration ด้วย Build และ Lint ของแต่ละ Package
- `pnpm install`, `pnpm build` และ `pnpm lint` ต้องจบด้วย Exit Code 0
- Development Servers ต้องเริ่มพร้อมกันได้ด้วย `pnpm dev`
- HTTP Checks ต้องยืนยันว่า Frontend ทำงานบน Port 3000 และ Health Endpoint บน Port 3001 ตอบ Exact JSON ตามที่กำหนด

## เอกสาร

Root README ต้องครอบคลุมภาพรวม วัตถุประสงค์ทางธุรกิจ Tech Stack, Prerequisites, โครงสร้าง การติดตั้ง คำสั่ง Service URLs, Scope ปัจจุบัน และงานในอนาคต ส่วน `.env.example`, `.gitignore` และ Business Rules ต้องตรงตาม Requirement ที่ให้มา

## ข้อจำกัด

- ทำงานตรงใน Root `spk-r5-parking-log` ปัจจุบัน ห้ามสร้าง Project Root ซ้อน
- ใช้ Node.js 22 LTS และ pnpm
- ใช้ TypeScript Strict Mode และหลีกเลี่ยง `any` ที่ไม่จำเป็น
- ห้ามเพิ่ม Database, Prisma, Authentication, Docker, Production Secrets หรือ Business Logic การกระทำผิดจริง
- ห้ามเพิ่ม Dependency ที่ไม่เกี่ยวกับโครงสร้างเริ่มต้นนี้
