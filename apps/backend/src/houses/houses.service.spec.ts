import type { PrismaService } from '../database/prisma.service';
import { DomainError } from '../common/domain-error';
import { HousesService } from './houses.service';

const date = new Date('2026-07-19T03:00:00.000Z');

function houseRecord() {
  return {
    id: 'house-1',
    code: 'R5-001',
    sequenceNumber: 1,
    actualHouseNumber: null,
    isActive: true,
    cycles: [
      {
        id: 'cycle-1',
        cycleNumber: 1,
        status: 'OPEN' as const,
        openedAt: date,
        closedAt: null,
        violations: [
          {
            id: 'violation-cancelled',
            sequenceNumber: null,
            occurredAt: new Date('2026-07-17T03:00:00.000Z'),
            status: 'CANCELLED' as const,
            note: null,
            cancelledAt: date,
            cancellationReason: 'wrong house',
            fine: null,
          },
          {
            id: 'violation-3',
            sequenceNumber: 3,
            occurredAt: new Date('2026-07-19T03:00:00.000Z'),
            status: 'PENDING_FINE' as const,
            note: null,
            cancelledAt: null,
            cancellationReason: null,
            fine: {
              id: 'fine-3',
              amountBaht: 1000,
              status: 'PENDING' as const,
              paidAt: null,
              reference: null,
            },
          },
          {
            id: 'violation-1',
            sequenceNumber: 1,
            occurredAt: new Date('2026-07-18T03:00:00.000Z'),
            status: 'WARNING' as const,
            note: 'first',
            cancelledAt: null,
            cancellationReason: null,
            fine: null,
          },
        ],
      },
    ],
  };
}

describe('HousesService', () => {
  function setup(record: ReturnType<typeof houseRecord> | null) {
    const findMany = jest.fn().mockResolvedValue(record ? [record] : []);
    const findUnique = jest.fn().mockResolvedValue(record);
    const prisma = {
      house: {
        findMany,
        findUnique,
      },
    } as unknown as PrismaService;

    return { service: new HousesService(prisma), findMany };
  }

  it('lists ordered house summaries with active and pending totals', async () => {
    const { service, findMany } = setup(houseRecord());

    await expect(service.list()).resolves.toEqual([
      {
        id: 'house-1',
        code: 'R5-001',
        sequenceNumber: 1,
        actualHouseNumber: null,
        isActive: true,
        currentCycle: {
          id: 'cycle-1',
          cycleNumber: 1,
          violationCount: 2,
          pendingFineCount: 1,
          pendingAmountBaht: 1000,
        },
      },
    ]);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('returns cycles newest first and active violations before cancelled', async () => {
    const record = houseRecord();
    record.cycles.unshift({
      ...record.cycles[0],
      id: 'cycle-2',
      cycleNumber: 2,
      status: 'CLOSED',
      closedAt: date,
      violations: [],
    });
    const { service } = setup(record);

    const result = await service.getByCode('R5-001');

    expect(result.cycles.map(({ id }) => id)).toEqual(['cycle-2', 'cycle-1']);
    expect(result.cycles[1]?.violations.map(({ id }) => id)).toEqual([
      'violation-1',
      'violation-3',
      'violation-cancelled',
    ]);
  });

  it('throws HOUSE_NOT_FOUND for an unknown code', async () => {
    const { service } = setup(null);

    await expect(service.getByCode('R5-164')).rejects.toEqual(
      new DomainError(404, 'HOUSE_NOT_FOUND', 'House not found'),
    );
  });
});
