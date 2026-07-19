import type { PrismaClient } from '../generated/prisma/client';

export interface HouseSeedRow {
  code: string;
  sequenceNumber: number;
}

export function buildHouseSeed(): HouseSeedRow[] {
  return Array.from({ length: 164 }, (_, index) => {
    const sequenceNumber = index + 1;

    return {
      code: `R5-${sequenceNumber.toString().padStart(3, '0')}`,
      sequenceNumber,
    };
  });
}

export async function seedHouses(prisma: PrismaClient): Promise<void> {
  const operations = buildHouseSeed().map((house) =>
    prisma.house.upsert({
      where: { code: house.code },
      update: {},
      create: house,
    }),
  );

  await prisma.$transaction(operations);
}
