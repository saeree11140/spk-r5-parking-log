import type { Prisma } from '../generated/prisma/client';
import { SYSTEM_ACTOR } from '../audit/audit-log';
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

    const result = await resequenceCycle(tx, 'cycle-1', SYSTEM_ACTOR);

    expect(result.map(({ fineAmountBaht }) => fineAmountBaht)).toEqual([
      0, 0, 1000, 500, 500,
    ]);
    expect(result.reduce((total, item) => total + item.fineAmountBaht, 0)).toBe(
      2000,
    );
    expect(upsert).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
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

    await resequenceCycle(tx, 'cycle-1', SYSTEM_ACTOR);

    expect(upsert).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: '00000000-0000-4000-8000-000000000003' },
      data: { sequenceNumber: 3, status: 'PAID' },
    });
  });

  it('updates and audits the real state when resequencing cancels an existing fine', async () => {
    const fineBefore = {
      id: '10000000-0000-4000-8000-000000000003',
      violationId: '00000000-0000-4000-8000-000000000003',
      amountBaht: 1000,
      status: 'PENDING' as const,
      paidAt: null,
      reference: null,
    };
    const fineAfter = {
      ...fineBefore,
      amountBaht: 0,
      status: 'CANCELLED' as const,
    };
    const fineUpdate = jest.fn().mockResolvedValue(fineAfter);
    const auditCreate = jest.fn().mockResolvedValue({});
    const tx = {
      parkingViolation: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: fineBefore.violationId,
            sequenceNumber: 3,
            occurredAt: new Date('2026-07-01T00:00:00Z'),
            createdAt: new Date('2026-07-01T00:00:00Z'),
            status: 'PENDING_FINE',
            fine: fineBefore,
          },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
      fine: {
        update: fineUpdate,
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        upsert: jest.fn(),
      },
      auditLog: { create: auditCreate },
    } as unknown as Prisma.TransactionClient;

    await resequenceCycle(tx, 'cycle-1', SYSTEM_ACTOR);

    expect(fineUpdate).toHaveBeenCalledWith({
      where: { id: fineBefore.id },
      data: {
        amountBaht: 0,
        status: 'CANCELLED',
        paidAt: null,
        reference: null,
      },
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        entityType: 'Fine',
        entityId: fineBefore.id,
        action: 'UPDATE',
        before: { status: 'PENDING', amountBaht: 1000 },
        after: { status: 'CANCELLED', amountBaht: 0 },
        actorType: 'SYSTEM',
        actorId: null,
        actorLabel: 'core-api',
      },
    });
  });

  it('skips fine writes and audits when a cancelled zero fine already matches the plan', async () => {
    const fine = {
      id: '10000000-0000-4000-8000-000000000001',
      violationId: '00000000-0000-4000-8000-000000000001',
      amountBaht: 0,
      status: 'CANCELLED' as const,
      paidAt: null,
      reference: null,
    };
    const fineUpdate = jest.fn();
    const fineUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    const fineUpsert = jest.fn();
    const auditCreate = jest.fn().mockResolvedValue({});
    const tx = {
      parkingViolation: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: fine.violationId,
            sequenceNumber: 1,
            occurredAt: new Date('2026-07-01T00:00:00Z'),
            createdAt: new Date('2026-07-01T00:00:00Z'),
            status: 'WARNING',
            fine,
          },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
      fine: {
        update: fineUpdate,
        updateMany: fineUpdateMany,
        upsert: fineUpsert,
      },
      auditLog: { create: auditCreate },
    } as unknown as Prisma.TransactionClient;

    await resequenceCycle(tx, 'cycle-1', SYSTEM_ACTOR);

    expect(fineUpdate).not.toHaveBeenCalled();
    expect(fineUpdateMany).not.toHaveBeenCalled();
    expect(fineUpsert).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });
});
