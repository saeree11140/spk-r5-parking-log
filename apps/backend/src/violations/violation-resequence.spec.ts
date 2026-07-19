import type { Prisma } from '../generated/prisma/client';
import { resequenceCycle } from './violation-resequence';

describe('resequenceCycle', () => {
  it('assigns sequence 1-5 and fines totaling 2000 baht', async () => {
    const violations = Array.from({ length: 5 }, (_, index) => ({
      id: `00000000-0000-4000-8000-00000000000${index + 1}`,
      sequenceNumber: index + 1,
      occurredAt: new Date(`2026-07-${10 + index}T00:00:00.000Z`),
      createdAt: new Date(`2026-07-${10 + index}T00:00:00.000Z`),
      status: index < 2 ? ('WARNING' as const) : ('PENDING_FINE' as const),
      fine:
        index < 2
          ? null
          : {
              id: `10000000-0000-4000-8000-00000000000${index + 1}`,
              status: 'PENDING' as const,
              amountBaht: index === 2 ? 1000 : 500,
            },
    }));
    const update = jest.fn().mockResolvedValue({});
    const upsert = jest
      .fn()
      .mockResolvedValue({ id: '10000000-0000-4000-8000-000000000099' });
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const auditCreate = jest.fn().mockResolvedValue({});
    const tx = {
      parkingViolation: {
        findMany: jest.fn().mockResolvedValue(violations),
        update,
      },
      fine: { upsert, updateMany },
      auditLog: { create: auditCreate },
    } as unknown as Prisma.TransactionClient;

    const result = await resequenceCycle(tx, 'cycle-1');

    expect(result.map(({ fineAmountBaht }) => fineAmountBaht)).toEqual([
      0, 0, 1000, 500, 500,
    ]);
    expect(result.reduce((total, item) => total + item.fineAmountBaht, 0)).toBe(
      2000,
    );
    expect(upsert).toHaveBeenCalledTimes(3);
    expect(update).toHaveBeenCalledWith({
      where: { id: violations[2]?.id },
      data: { sequenceNumber: 3, status: 'PENDING_FINE' },
    });
  });

  it('keeps paid fine and paid violation unchanged', async () => {
    const update = jest.fn().mockResolvedValue({});
    const upsert = jest.fn().mockResolvedValue({});
    const tx = {
      parkingViolation: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: '00000000-0000-4000-8000-000000000001',
            sequenceNumber: 1,
            occurredAt: new Date('2026-07-01T00:00:00Z'),
            createdAt: new Date('2026-07-01T00:00:00Z'),
            status: 'WARNING',
            fine: null,
          },
          {
            id: '00000000-0000-4000-8000-000000000002',
            sequenceNumber: 2,
            occurredAt: new Date('2026-07-02T00:00:00Z'),
            createdAt: new Date('2026-07-02T00:00:00Z'),
            status: 'WARNING',
            fine: null,
          },
          {
            id: '00000000-0000-4000-8000-000000000003',
            sequenceNumber: 3,
            occurredAt: new Date('2026-07-03T00:00:00Z'),
            createdAt: new Date('2026-07-03T00:00:00Z'),
            status: 'PAID',
            fine: {
              id: '10000000-0000-4000-8000-000000000003',
              status: 'PAID',
              amountBaht: 1000,
            },
          },
        ]),
        update,
      },
      fine: { upsert, updateMany: jest.fn() },
      auditLog: { create: jest.fn() },
    } as unknown as Prisma.TransactionClient;

    await resequenceCycle(tx, 'cycle-1');

    expect(upsert).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: '00000000-0000-4000-8000-000000000003' },
      data: { sequenceNumber: 3, status: 'PAID' },
    });
  });
});
