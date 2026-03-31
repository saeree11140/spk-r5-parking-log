# SPK R5 Parking Log

ระบบติดตามบ้านที่มีการจอดรถหน้าบ้านในแต่ละวัน พร้อมสถานะสีและกติกาค่าปรับ

## กติกาธุรกิจ

- ครั้งที่ 1: แจ้งเตือนครั้งที่ 1 แสดงสีขาว
- ครั้งที่ 2: แจ้งเตือนครั้งที่ 2 แสดงสีขาว
- ครั้งที่ 3: เริ่มคิดค่าปรับ 1,000 บาท
- ครั้งที่ 4 เป็นต้นไป: คิดค่าปรับครั้งละ 500 บาท
- ชำระแล้ว: สีเขียว
- ยังไม่ชำระ: สีแดงอ่อน

## สถาปัตยกรรม

- `apps/web`: Next.js 16 App Router สำหรับ dashboard และฟอร์มบันทึกข้อมูล
- `apps/api`: Nest.js 11 สำหรับ API และกฎคำนวณค่าปรับ
- `Prisma + SQLite`: เก็บบ้าน, เหตุการณ์จอดรถ, และประวัติชำระเงิน

## โครงสร้างฐานข้อมูล

### `House`
- `code`: รหัสบ้าน
- `ownerName`: ชื่อเจ้าของบ้าน
- `address`: ที่อยู่

### `ParkingIncident`
- `houseId`: อ้างอิงบ้าน
- `incidentDate`: วันที่เกิดเหตุ
- `offenseCount`: ลำดับครั้งสะสมของบ้านหลังนั้น
- `noticeLevel`: ระดับการเตือน/ลงโทษ
- `fineAmount`: ค่าปรับของเหตุการณ์นั้น
- `outstandingAmount`: ยอดที่ยังค้างชำระ
- `note`: หมายเหตุ

### `FinePayment`
- `incidentId`: อ้างอิงรายการค่าปรับ
- `amount`: จำนวนเงินที่ชำระ
- `paidAt`: เวลาชำระ

## เริ่มต้นใช้งาน

1. ติดตั้งแพ็กเกจ

```bash
npm install
```

2. ตั้งค่า API environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

3. สร้างฐานข้อมูลและใส่ข้อมูลตัวอย่าง

```bash
npm run db:push
npm run db:seed
```

4. รันทั้งเว็บและ API

```bash
npm run dev
```

- Web: [http://localhost:3001](http://localhost:3001)
- API: [http://localhost:3000](http://localhost:3000)

## คำสั่งที่ใช้บ่อย

```bash
npm run build
npm run lint
npm run db:generate
```
