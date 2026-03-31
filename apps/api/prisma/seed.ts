import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.finePayment.deleteMany();
  await prisma.parkingIncident.deleteMany();
  await prisma.house.deleteMany();

  await prisma.house.createMany({
    data: [
      { code: 'A01', ownerName: 'คุณสมชาย', address: 'บ้านเลขที่ 99/1 ซอยสวนหลวง' },
      { code: 'A02', ownerName: 'คุณศิริพร', address: 'บ้านเลขที่ 99/2 ซอยสวนหลวง' },
      { code: 'B07', ownerName: 'คุณธนพล', address: 'บ้านเลขที่ 101/7 ซอยสวนหลวง' },
      { code: 'C12', ownerName: 'คุณกาญจนา', address: 'บ้านเลขที่ 103/12 ซอยสวนหลวง' },
      { code: 'D03', ownerName: 'คุณปรีชา', address: 'บ้านเลขที่ 105/3 ซอยสวนหลวง' },
    ],
  });

  const houses = await prisma.house.findMany({ orderBy: { id: 'asc' } });

  const incidents = await Promise.all([
    prisma.parkingIncident.create({
      data: {
        houseId: houses[0].id,
        incidentDate: new Date('2026-03-29T08:00:00.000Z'),
        note: 'แจ้งเตือนครั้งแรก',
        offenseCount: 1,
        noticeLevel: 1,
      },
    }),
    prisma.parkingIncident.create({
      data: {
        houseId: houses[1].id,
        incidentDate: new Date('2026-03-29T08:30:00.000Z'),
        note: 'แจ้งเตือนครั้งที่สอง',
        offenseCount: 2,
        noticeLevel: 2,
      },
    }),
    prisma.parkingIncident.create({
      data: {
        houseId: houses[2].id,
        incidentDate: new Date('2026-03-29T09:00:00.000Z'),
        note: 'เริ่มคิดค่าปรับครั้งแรก',
        offenseCount: 3,
        noticeLevel: 3,
        fineAmount: 1000,
        outstandingAmount: 1000,
      },
    }),
    prisma.parkingIncident.create({
      data: {
        houseId: houses[3].id,
        incidentDate: new Date('2026-03-29T09:30:00.000Z'),
        note: 'ชำระค่าปรับแล้ว',
        offenseCount: 4,
        noticeLevel: 4,
        fineAmount: 500,
        outstandingAmount: 0,
        payment: {
          create: {
            amount: 500,
            paidAt: new Date('2026-03-29T10:00:00.000Z'),
          },
        },
      },
    }),
    prisma.parkingIncident.create({
      data: {
        houseId: houses[4].id,
        incidentDate: new Date('2026-03-28T07:45:00.000Z'),
        note: 'บันทึกย้อนหลังตัวอย่าง',
        offenseCount: 3,
        noticeLevel: 3,
        fineAmount: 1000,
        outstandingAmount: 1000,
      },
    }),
  ]);

  return incidents;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
