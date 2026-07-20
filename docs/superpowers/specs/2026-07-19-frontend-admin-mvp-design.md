# เอกสารออกแบบ Frontend Admin MVP สำหรับ SPK R5 Parking Log

## เป้าหมาย

เปลี่ยน Frontend จากหน้าแสดงสถานะเป็น Admin UI ภาษาไทยสำหรับเจ้าหน้าที่สำนักงาน ใช้งาน Desktop เป็นหลักและรองรับมือถือ เจ้าหน้าที่ต้องดูภาพรวมบ้าน 164 หลัง ค้นหาบ้าน อ่านประวัติ เพิ่มหรือยกเลิก Violation และบันทึก Fine ว่าชำระแล้วได้จาก UI โดยใช้ Core Parking API ที่มีอยู่

## ขอบเขต

รวม:

- Dashboard สรุปสถานะหมู่บ้าน
- ตารางบ้าน 164 หลัง พร้อม Search และ Filter
- House Detail แยก URL รายบ้าน
- Create Violation
- Cancel Violation พร้อมเหตุผลและ Confirmation
- Mark Fine Paid พร้อมเลขอ้างอิงและ Confirmation
- Loading, Empty, Error และ Success Feedback
- Responsive Layout สำหรับมือถือ
- Client-side Validation และ Automated Frontend Tests

ไม่รวม:

- Authentication และ Authorization
- Online Payment หรือ Payment Gateway
- Evidence Upload และ Object Storage
- แก้ข้อมูลบ้าน
- แก้ไข Violation หลังสร้าง นอกจาก Cancel
- Real-time หรือ WebSocket
- Pagination เพราะมีบ้านคงที่ 164 หลัง

## แนวทางที่เลือก

ใช้ Multi-page Admin บน Next.js App Router:

- `/` เป็น Dashboard และตารางบ้าน
- `/houses/[houseCode]` เป็น House Detail และหน้าทำรายการ
- Modal ใช้เฉพาะ Create Violation, Cancel และ Mark Paid
- Frontend เรียก NestJS API โดยตรงผ่าน `NEXT_PUBLIC_API_URL`
- คง `output: "export"`; สร้าง static route บ้าน `R5-001` ถึง `R5-164` ผ่าน `generateStaticParams`

ไม่เลือก Single-page Side Panel เพราะประวัติหลาย Cycle อ่านยาก และไม่เลือก Next.js BFF เพราะเพิ่ม server deployment โดยยังไม่มี requirement ด้าน Authentication

## Technology Decisions

- TanStack Query จัดการ API server state, cache, mutation และ invalidation
- React Hook Form จัดการ form state และ submit state
- Zod เป็น client validation schema
- `@hookform/resolvers` เชื่อม Zod กับ React Hook Form
- Zustand เก็บเฉพาะ client UI state ได้แก่ Dashboard search, filter และ sidebar state
- date-fns จัดการ parse, format, compare และแปลงวันเวลาของ form
- Axios เป็น HTTP client กลางสำหรับ TanStack Query
- Vitest และ React Testing Library ใช้ทดสอบ unit/component

ห้ามเก็บ House API data ใน Zustand เพราะ TanStack Query เป็น source of truth ของ server state

## Information Architecture

### Application Shell

Desktop ใช้ sidebar ซ้ายและ content area ด้านขวา Sidebar มี:

- ภาพรวม
- รายชื่อบ้าน
- ชื่อระบบ SPK R5 Parking Log

Mobile ย่อ sidebar เป็น navigation control ด้านบน Content และ action modal ใช้พื้นที่เต็มจอเมื่อจำเป็น

### Dashboard `/`

ส่วนบนแสดง KPI ที่คำนวณจาก `GET /api/houses`:

- บ้านทั้งหมด
- บ้านที่มี Active Violation ใน Cycle ปัจจุบัน
- Fine รอชำระทั้งหมด
- ยอดรอชำระรวม

ส่วนถัดมาเป็น Search และ Filter:

- ค้นด้วยรหัสบ้านหรือเลขที่บ้านจริง
- ทั้งหมด
- มี Violation
- มี Fine รอชำระ
- ไม่มีประวัติใน Cycle ปัจจุบัน
- บ้านปิดใช้งาน

ตารางเรียงตาม `sequenceNumber` และมีคอลัมน์:

- รหัสบ้าน
- เลขที่บ้านจริง
- จำนวน Violation ปัจจุบัน
- Fine รอชำระ
- ยอดค้าง
- สถานะ
- Action ดูรายละเอียด

### House Detail `/houses/[houseCode]`

Header มี breadcrumb, รหัสบ้าน, สถานะบ้าน, ปุ่ม Refresh และปุ่มเพิ่ม Violation

Summary แสดง:

- Cycle ปัจจุบัน
- จำนวน Violation
- Fine รอชำระ
- ยอดรอชำระ

History แสดง Cycle ใหม่ไปเก่า แต่ละ Cycle มี status, วันที่เปิด/ปิด, ยอดรวม, ยอดชำระแล้ว และยอดค้าง ตาราง Violation แสดง:

- ลำดับ
- วันเวลาเกิดเหตุ
- หมายเหตุ
- สถานะ
- Fine
- วันเวลาชำระและเลขอ้างอิง
- Action ที่ใช้ได้ตามสถานะ

Violation ที่ `CANCELLED` อยู่ท้าย Cycle และแสดงเหตุผลยกเลิก

## Visual Direction

ใช้ Light Admin UI อ่านง่ายในสำนักงาน แต่คงเอกลักษณ์ระบบจอดรถผ่านรหัสบ้านทรงป้ายถนน

### Color Tokens

- Canvas: `#F4F6F8`
- Surface: `#FFFFFF`
- Ink: `#17212B`
- Muted: `#667085`
- Border: `#D0D5DD`
- Road Blue: `#175CD3`
- Warning Amber: `#D97706`
- Danger Red: `#B42318`
- Success Green: `#067647`

### Typography

- `Noto Sans Thai` สำหรับข้อความ UI
- `Chakra Petch` สำหรับรหัสบ้าน ตัวเลข และข้อมูลเชิงระบบ
- ใช้ font loading แบบ Next.js ที่ build ซ้ำได้

### Signature Element

รหัสบ้าน เช่น `R5-164` ใช้กรอบสีน้ำเงินและตัวเลขทรงป้ายถนน เป็นจุดเด่นเพียงจุดเดียว ส่วนอื่นใช้ spacing, border และ hierarchy แบบเรียบ

Motion จำกัดเฉพาะ modal enter/exit, button feedback และ skeleton ลดหรือปิดเมื่อ `prefers-reduced-motion: reduce`

## Client Architecture

### Providers

Root client provider สร้าง `QueryClient` หนึ่ง instance และครอบ application ด้วย `QueryClientProvider`

### API Client

สร้าง Axios instance หนึ่งตัว รับ `baseURL` จาก `NEXT_PUBLIC_API_URL`, ตั้ง timeout 10 วินาที และใช้ JSON เป็นค่าเริ่มต้น API client มี methods:

- `getHouses()`
- `getHouse(houseCode)`
- `createViolation(houseCode, input)`
- `cancelViolation(houseCode, violationId, input)`
- `markFinePaid(houseCode, violationId, input)`

Response interceptor แปลง non-2xx response เป็น `ApiError` จาก `{ statusCode, code, message }` ถ้า parse ไม่ได้ใช้ Network/Unknown error ที่ไม่เปิดเผยข้อมูลภายใน TanStack Query เรียก API client นี้เท่านั้น Component ห้ามเรียก Axios โดยตรง

### Query Keys

- `['houses']`
- `['house', houseCode]`

Mutation สำเร็จแล้ว invalidate ทั้งสอง key เพื่อให้ Dashboard และ Detail ตรงกัน ปุ่ม Refresh เรียก `refetch` ไม่ใช้ polling

### Zustand Store

Store มี:

- `searchQuery`
- `houseFilter`
- `sidebarCollapsed`
- actions สำหรับเปลี่ยนและ reset ค่า

ไม่ persist ค่าใน local storage ใน MVP เพื่อไม่ให้ filter เก่าทำให้ผู้ใช้เข้าใจว่าข้อมูลหาย

### Date Utilities

สร้าง date utility กลางด้วย date-fns เพื่อให้ทุกหน้าจอใช้กฎเดียวกัน:

- `formatThaiDateTime(value)` แสดง `dd/MM/yyyy HH:mm` ด้วย locale ไทย
- `toDateTimeLocalValue(value)` แปลง ISO จาก API เป็นค่าเริ่มต้นของ `datetime-local`
- `localDateTimeToIso(value)` parse ค่า `datetime-local` ตาม timezone เครื่องผู้ใช้แล้วส่งเป็น ISO 8601 ด้วย `toISOString()`
- `isFutureDateTime(value, now)` ตรวจวันเวลาอนาคต
- `isBeforeViolation(value, occurredAt)` ตรวจเวลาชำระก่อนเวลาเกิดเหตุ

Component ห้าม parse หรือ format วันที่เองโดยตรง API เก็บและส่ง ISO timestamp; Frontend แสดงเวลาไทยและส่ง ISO พร้อม timezone กลับ Backend

## Forms และ Validation

### Create Violation

- `occurredAt`: required, local datetime, ห้ามอนาคต
- `note`: optional, trim, สูงสุด 1,000 ตัวอักษร
- แปลง local datetime เป็น ISO 8601 พร้อม timezone ก่อนส่ง
- ใช้ date-fns date utility กลางสำหรับ parse และตรวจอนาคต

### Cancel Violation

- `reason`: required, trim, 5–500 ตัวอักษร
- แสดง Confirmation ว่าระบบจะเก็บประวัติและคำนวณ sequence/fine ใหม่
- ไม่แสดง Action เมื่อ Cycle ปิด, Violation ถูกยกเลิก หรือ Cycle มี Fine ชำระแล้ว

### Mark Fine Paid

- `paidAt`: required, local datetime, ห้ามอนาคต และห้ามก่อน `occurredAt`
- `reference`: optional, trim, สูงสุด 128 ตัวอักษร
- ไม่มี input `amountBaht`
- ใช้ date-fns เปรียบเทียบ `paidAt` กับ `occurredAt`
- แสดง Confirmation เพราะ `PAID` ย้อนกลับไม่ได้ใน scope นี้

ทุก form disable submit ระหว่าง mutation เพื่อป้องกัน double submit Backend ยังเป็นผู้ตรวจ business rules ขั้นสุดท้าย

## Feedback และ Error Handling

- Initial loading ใช้ skeleton ที่รักษา layout
- Empty Dashboard/History อธิบายสถานะและ action ถัดไป
- Field validation แสดงใต้ field
- Backend domain error แสดงใน modal โดยใช้ message จาก API
- Network error แสดงสถานะเชื่อมต่อไม่ได้และปุ่ม “ลองใหม่”
- Mutation สำเร็จปิด modal แสดง feedback สั้น แล้ว refresh query
- `CONCURRENT_MODIFICATION` แจ้งให้กดลองใหม่
- ไม่แสดง stack trace, raw response หรือ connection detail

## Accessibility และ Responsive

- ใช้ semantic heading, table, form และ button
- ทุก input มี label
- Modal มี focus management, Escape close และ focus return
- Visible keyboard focus
- สีสถานะมีข้อความกำกับ ไม่ใช้สีอย่างเดียว
- ตารางมี horizontal scroll บน viewport แคบ
- Action หลักมี touch target อย่างน้อย 44px บนมือถือ
- รองรับ `prefers-reduced-motion`

## Testing

### Unit Tests

- Zod schemas: required, trim, length, future datetime และ paid-before-violation
- Date utilities: ISO parse, Thai format, local datetime conversion และ boundary comparison
- Axios API client: success, domain error, timeout และ network error
- Zustand store: search/filter/reset/sidebar
- Dashboard selectors: KPI และ filter

### Component Tests

- Dashboard loading, error, empty และ table data
- Search/filter interaction
- House Detail cycle/violation ordering
- Create/Cancel/Mark Paid form validation
- Mutation success invalidates `houses` และ `house` queries
- Mutation error คง modal และแสดงข้อความ
- Action visibility ตามสถานะ

### Verification

- Frontend unit/component tests ผ่าน
- Frontend lint และ TypeScript ผ่าน
- Static export build สร้าง Dashboard และ route บ้าน 164 หลัง
- ทดสอบกับ Backend จริงผ่าน browser บน Desktop และ mobile viewport
- ตรวจ screenshot, keyboard focus และ overflow

## เกณฑ์ยอมรับ

- เจ้าหน้าที่เห็น Dashboard ภาษาไทยและ KPI จากข้อมูลจริง
- ค้นหาและกรองบ้าน 164 หลังได้
- เปิด URL รายบ้านโดยตรงได้หลัง static export
- เพิ่มและยกเลิก Violation ผ่าน form ได้
- Mark Fine Paid ได้เฉพาะ Fine รอชำระ
- UI refresh หลัง mutation และแสดงข้อมูลตรง Backend
- Error จาก validation, business rule และ network เข้าใจได้
- Desktop workflow ใช้งานเร็ว และ mobile ไม่แตก
- Frontend tests, lint และ build ผ่าน
