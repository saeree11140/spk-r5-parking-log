import { Test, type TestingModule } from '@nestjs/testing';

import { DatabaseModule } from '../src/database/database.module';
import { seedHouses } from '../src/database/house-seed';
import { PrismaService } from '../src/database/prisma.service';

describe('Database and house seed (e2e)', () => {
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();
    await moduleFixture.init();
    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  it('connects to PostgreSQL', async () => {
    await expect(prisma.$queryRaw`SELECT 1 AS value`).resolves.toEqual([
      { value: 1 },
    ]);
  });

  it('applies custom domain constraints', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'violation_cycles_one_open_per_house'
    `;
    const constraints = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname
      FROM pg_constraint
      WHERE conname IN (
        'houses_sequence_number_positive',
        'violation_cycles_cycle_number_positive',
        'violation_cycles_closed_at_matches_status',
        'parking_violations_sequence_matches_status',
        'fines_amount_baht_non_negative',
        'fine_payments_amount_baht_positive',
        'evidence_size_bytes_non_negative'
      )
    `;

    expect(indexes).toEqual([
      { indexname: 'violation_cycles_one_open_per_house' },
    ]);
    expect(constraints).toHaveLength(7);
  });

  it('seeds 164 unique ordered houses', async () => {
    await seedHouses(prisma);

    const houses = await prisma.house.findMany({
      orderBy: { sequenceNumber: 'asc' },
    });

    expect(houses).toHaveLength(164);
    expect(houses[0]?.code).toBe('R5-001');
    expect(houses[163]?.code).toBe('R5-164');
    expect(new Set(houses.map(({ code }) => code)).size).toBe(164);
    expect(
      new Set(houses.map(({ sequenceNumber }) => sequenceNumber)).size,
    ).toBe(164);
  });

  it('is idempotent and preserves existing house data', async () => {
    await seedHouses(prisma);
    await prisma.house.update({
      where: { code: 'R5-001' },
      data: { actualHouseNumber: 'TEST-KEEP', isActive: false },
    });

    try {
      await seedHouses(prisma);

      const [count, house] = await Promise.all([
        prisma.house.count(),
        prisma.house.findUniqueOrThrow({ where: { code: 'R5-001' } }),
      ]);

      expect(count).toBe(164);
      expect(house.actualHouseNumber).toBe('TEST-KEEP');
      expect(house.isActive).toBe(false);
    } finally {
      await prisma.house.update({
        where: { code: 'R5-001' },
        data: { actualHouseNumber: null, isActive: true },
      });
    }
  });
});
