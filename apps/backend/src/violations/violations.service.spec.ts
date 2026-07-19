import type { PrismaService } from '../database/prisma.service';
import { DomainError } from '../common/domain-error';
import { ViolationsService } from './violations.service';

const occurredAt = '2026-07-18T10:00:00+07:00';

function prismaFor(tx: object): PrismaService {
  return {
    $transaction: jest.fn((operation: (client: object) => unknown) =>
      Promise.resolve(operation(tx)),
    ),
  } as unknown as PrismaService;
}

describe('ViolationsService.create', () => {
  it('rejects missing house', async () => {
    const tx = { house: { findUnique: jest.fn().mockResolvedValue(null) } };
    const service = new ViolationsService(prismaFor(tx));

    await expect(service.create('R5-001', { occurredAt })).rejects.toEqual(
      new DomainError(404, 'HOUSE_NOT_FOUND', 'House not found'),
    );
  });

  it('rejects inactive house', async () => {
    const tx = {
      house: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'house-1', isActive: false }),
      },
    };
    const service = new ViolationsService(prismaFor(tx));

    await expect(service.create('R5-001', { occurredAt })).rejects.toEqual(
      new DomainError(409, 'HOUSE_INACTIVE', 'House is inactive'),
    );
  });

  it('rejects a violation before the last closed cycle', async () => {
    const tx = {
      house: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'house-1', isActive: true }),
      },
      violationCycle: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            cycleNumber: 1,
            closedAt: new Date('2026-07-19T00:00:00Z'),
          }),
      },
    };
    const service = new ViolationsService(prismaFor(tx));

    await expect(service.create('R5-001', { occurredAt })).rejects.toEqual(
      new DomainError(
        409,
        'BACKDATE_NOT_ALLOWED',
        'Violation cannot be backdated before closed cycle',
      ),
    );
  });

  it('rejects backdating after a fine has been paid', async () => {
    const tx = {
      house: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'house-1', isActive: true }),
      },
      violationCycle: {
        findFirst: jest.fn().mockResolvedValue({ id: 'cycle-1' }),
      },
      fine: { count: jest.fn().mockResolvedValue(1) },
      parkingViolation: {
        findFirst: jest.fn().mockResolvedValue({
          occurredAt: new Date('2026-07-19T04:00:00Z'),
        }),
      },
    };
    const service = new ViolationsService(prismaFor(tx));

    await expect(service.create('R5-001', { occurredAt })).rejects.toEqual(
      new DomainError(
        409,
        'BACKDATE_NOT_ALLOWED',
        'Paid cycle cannot accept backdated violations',
      ),
    );
  });

  it('creates first cycle and violation with backend sequence', async () => {
    const violation = {
      id: '00000000-0000-4000-8000-000000000001',
      cycleId: 'cycle-1',
      sequenceNumber: 1,
      occurredAt: new Date('2026-07-18T03:00:00Z'),
      createdAt: new Date('2026-07-18T03:00:00Z'),
      status: 'WARNING',
      note: null,
      cancelledAt: null,
      cancellationReason: null,
      fine: null,
    };
    const createViolation = jest.fn().mockResolvedValue(violation);
    const auditCreate = jest.fn().mockResolvedValue({});
    const tx = {
      house: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'house-1', isActive: true }),
      },
      violationCycle: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'cycle-1',
          cycleNumber: 1,
          status: 'OPEN',
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'cycle-1',
          cycleNumber: 1,
          status: 'OPEN',
          violations: [violation],
        }),
      },
      parkingViolation: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _max: { sequenceNumber: null } }),
        create: createViolation,
        findMany: jest.fn().mockResolvedValue([violation]),
        update: jest.fn().mockResolvedValue(violation),
        findUniqueOrThrow: jest.fn().mockResolvedValue(violation),
      },
      fine: {
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn(),
      },
      auditLog: { create: auditCreate },
    };
    const service = new ViolationsService(prismaFor(tx));

    const result = await service.create('R5-001', { occurredAt });

    expect(createViolation).toHaveBeenCalledWith({
      data: {
        cycleId: 'cycle-1',
        occurredAt: new Date('2026-07-18T03:00:00Z'),
        sequenceNumber: 1,
        status: 'WARNING',
        note: null,
      },
    });
    expect(result.violation.sequenceNumber).toBe(1);
    expect(result.currentCycle.violationCount).toBe(1);
    expect(auditCreate).toHaveBeenCalled();
  });
});
