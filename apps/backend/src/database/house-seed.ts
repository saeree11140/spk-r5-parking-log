import type { PrismaClient } from '../generated/prisma/client';

export interface HouseSeedRow {
  actualHouseNumber: string;
  code: string;
  sequenceNumber: number;
}

export function buildHouseSeed(): HouseSeedRow[] {
  return Array.from({ length: 164 }, (_, index) => {
    const sequenceNumber = index + 1;

    return {
      actualHouseNumber: String(sequenceNumber),
      code: `R5-${sequenceNumber.toString().padStart(3, '0')}`,
      sequenceNumber,
    };
  });
}

export async function seedHouses(prisma: PrismaClient): Promise<void> {
  const operations = buildHouseSeed().flatMap((house) => [
    prisma.house.upsert({
      where: { code: house.code },
      update: {},
      create: house,
    }),
    prisma.house.updateMany({
      where: {
        code: house.code,
        OR: [
          { actualHouseNumber: null },
          { actualHouseNumber: `99/${house.sequenceNumber}` },
        ],
      },
      data: { actualHouseNumber: house.actualHouseNumber },
    }),
  ]);

  await prisma.$transaction(operations);
}
