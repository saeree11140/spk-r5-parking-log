import { plainToInstance } from 'class-transformer';

import { SYSTEM_ACTOR } from '../audit/audit-log';
import type { PrismaService } from '../database/prisma.service';
import { DomainError } from '../common/domain-error';
import { UpdateViolationDto } from './update-violation.dto';
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

    await expect(
      service.create('R5-001', { occurredAt }, SYSTEM_ACTOR),
    ).rejects.toEqual(
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

    await expect(
      service.create('R5-001', { occurredAt }, SYSTEM_ACTOR),
    ).rejects.toEqual(
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
            violations: [{ occurredAt: new Date('2026-07-19T04:00:00Z') }],
          }),
      },
    };
    const service = new ViolationsService(prismaFor(tx));

    await expect(
      service.create('R5-001', { occurredAt }, SYSTEM_ACTOR),
    ).rejects.toEqual(
      new DomainError(
        409,
        'BACKDATE_NOT_ALLOWED',
        'Violation cannot be backdated before closed cycle',
      ),
    );
  });

  it.each([
    {
      description: 'after the last violation even before the cycle closed',
      latestViolationAt: '2025-10-04T01:50:04Z',
    },
    {
      description: 'at the same time as the last violation',
      latestViolationAt: '2026-07-26T01:50:04Z',
    },
  ])('starts a new cycle $description', async ({ latestViolationAt }) => {
    const nextOccurredAt = '2026-07-26T08:50:04+07:00';
    const violation = {
      id: '00000000-0000-4000-8000-000000000001',
      cycleId: 'cycle-2',
      sequenceNumber: 1,
      occurredAt: new Date('2026-07-26T01:50:04Z'),
      createdAt: new Date('2026-07-26T01:50:04Z'),
      status: 'WARNING',
      note: 'ผิดระเบียบครั้งที่ 1',
      cancelledAt: null,
      cancellationReason: null,
      fine: null,
    };
    const findCycle = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'cycle-1',
        cycleNumber: 1,
        closedAt: new Date('2026-08-17T01:51:29Z'),
        violations: [{ occurredAt: new Date(latestViolationAt) }],
      });
    const createCycle = jest.fn().mockResolvedValue({
      id: 'cycle-2',
      cycleNumber: 2,
      status: 'OPEN',
    });
    const tx = {
      house: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'house-1', isActive: true }),
      },
      violationCycle: {
        findFirst: findCycle,
        create: createCycle,
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'cycle-2',
          cycleNumber: 2,
          status: 'OPEN',
          violations: [violation],
        }),
      },
      parkingViolation: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _max: { sequenceNumber: null } }),
        create: jest.fn().mockResolvedValue(violation),
        findMany: jest.fn().mockResolvedValue([violation]),
        update: jest.fn().mockResolvedValue(violation),
        findUniqueOrThrow: jest.fn().mockResolvedValue(violation),
      },
      fine: {
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new ViolationsService(prismaFor(tx));

    const result = await service.create(
      'R5-026',
      { occurredAt: nextOccurredAt, note: 'ผิดระเบียบครั้งที่ 1' },
      SYSTEM_ACTOR,
    );

    expect(createCycle).toHaveBeenCalledWith({
      data: {
        houseId: 'house-1',
        cycleNumber: 2,
        status: 'OPEN',
        openedAt: new Date('2026-07-26T01:50:04Z'),
      },
    });
    expect(findCycle).toHaveBeenNthCalledWith(2, {
      where: { houseId: 'house-1' },
      orderBy: { cycleNumber: 'desc' },
      include: {
        violations: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: [
            { occurredAt: 'desc' },
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
          take: 1,
        },
      },
    });
    expect(result.currentCycle.cycleNumber).toBe(2);
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

    await expect(
      service.create('R5-001', { occurredAt }, SYSTEM_ACTOR),
    ).rejects.toEqual(
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

    const result = await service.create('R5-001', { occurredAt }, SYSTEM_ACTOR);

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

describe('ViolationsService.cancel', () => {
  afterEach(() => jest.useRealTimers());

  function baseViolation(overrides: Record<string, unknown> = {}) {
    return {
      id: '00000000-0000-4000-8000-000000000003',
      cycleId: 'cycle-1',
      sequenceNumber: 3,
      status: 'PENDING_FINE',
      cycle: { id: 'cycle-1', status: 'OPEN' },
      fine: {
        id: '10000000-0000-4000-8000-000000000003',
        status: 'PENDING',
        amountBaht: 1000,
      },
      ...overrides,
    };
  }

  it('rejects missing or mismatched violation', async () => {
    const tx = {
      parkingViolation: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new ViolationsService(prismaFor(tx));

    await expect(
      service.cancel(
        'R5-001',
        '00000000-0000-4000-8000-000000000003',
        {
          reason: 'wrong house',
        },
        SYSTEM_ACTOR,
      ),
    ).rejects.toEqual(
      new DomainError(404, 'VIOLATION_NOT_FOUND', 'Violation not found'),
    );
  });

  it.each([
    [
      { cycle: { id: 'cycle-1', status: 'CLOSED' } },
      new DomainError(409, 'CYCLE_CLOSED', 'Cycle is closed'),
    ],
    [
      { status: 'CANCELLED' },
      new DomainError(
        409,
        'VIOLATION_ALREADY_CANCELLED',
        'Violation is already cancelled',
      ),
    ],
  ])('rejects immutable violation state', async (overrides, error) => {
    const tx = {
      parkingViolation: {
        findFirst: jest.fn().mockResolvedValue(baseViolation(overrides)),
      },
    };
    const service = new ViolationsService(prismaFor(tx));

    await expect(
      service.cancel(
        'R5-001',
        '00000000-0000-4000-8000-000000000003',
        {
          reason: 'wrong house',
        },
        SYSTEM_ACTOR,
      ),
    ).rejects.toEqual(error);
  });

  it('rejects cancellation after any fine in cycle is paid', async () => {
    const tx = {
      parkingViolation: {
        findFirst: jest.fn().mockResolvedValue(baseViolation()),
      },
      fine: { count: jest.fn().mockResolvedValue(1) },
    };
    const service = new ViolationsService(prismaFor(tx));

    await expect(
      service.cancel(
        'R5-001',
        '00000000-0000-4000-8000-000000000003',
        {
          reason: 'wrong house',
        },
        SYSTEM_ACTOR,
      ),
    ).rejects.toEqual(
      new DomainError(
        409,
        'PAID_CYCLE_IMMUTABLE',
        'Paid cycle cannot be modified',
      ),
    );
  });

  it('cancels violation and obsolete fine then resequences', async () => {
    const now = new Date('2026-07-19T05:00:00Z');
    jest.useFakeTimers({ now });
    const original = baseViolation();
    const cancelled = {
      ...original,
      sequenceNumber: null,
      status: 'CANCELLED',
      occurredAt: new Date('2026-07-18T03:00:00Z'),
      note: null,
      cancelledAt: new Date(),
      cancellationReason: 'wrong house',
      fine: { ...original.fine, status: 'CANCELLED', amountBaht: 0 },
    };
    const update = jest.fn().mockResolvedValue(cancelled);
    const fineUpdate = jest.fn().mockResolvedValue({
      ...original.fine,
      status: 'CANCELLED',
      amountBaht: 0,
    });
    const auditCreate = jest.fn().mockResolvedValue({});
    const tx = {
      parkingViolation: {
        findFirst: jest.fn().mockResolvedValue(original),
        update,
        findMany: jest.fn().mockResolvedValue([]),
        findUniqueOrThrow: jest.fn().mockResolvedValue(cancelled),
      },
      violationCycle: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'cycle-1',
          cycleNumber: 1,
          violations: [cancelled],
        }),
      },
      fine: {
        count: jest.fn().mockResolvedValue(0),
        update: fineUpdate,
      },
      auditLog: { create: auditCreate },
    };
    const service = new ViolationsService(prismaFor(tx));

    const result = await service.cancel(
      'R5-001',
      '00000000-0000-4000-8000-000000000003',
      { reason: 'wrong house' },
      SYSTEM_ACTOR,
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: original.id },
      data: {
        sequenceNumber: null,
        status: 'CANCELLED',
        cancelledAt: now,
        cancellationReason: 'wrong house',
      },
    });
    expect(fineUpdate).toHaveBeenCalledWith({
      where: { id: original.fine.id },
      data: {
        amountBaht: 0,
        status: 'CANCELLED',
        paidAt: null,
        reference: null,
      },
    });
    expect(result.violation.status).toBe('CANCELLED');
    expect(auditCreate).toHaveBeenCalled();
  });
});

describe('ViolationsService.update', () => {
  function baseViolation(overrides: Record<string, unknown> = {}) {
    return {
      id: '00000000-0000-4000-8000-000000000004',
      cycleId: 'cycle-1',
      sequenceNumber: 1,
      occurredAt: new Date('2026-07-18T03:00:00Z'),
      createdAt: new Date('2026-07-18T03:00:00Z'),
      status: 'WARNING',
      note: 'stored note',
      cancelledAt: null,
      cancellationReason: null,
      cycle: {
        id: 'cycle-1',
        cycleNumber: 1,
        status: 'OPEN',
        openedAt: new Date('2026-07-01T00:00:00Z'),
        closedAt: null,
      },
      fine: null,
      ...overrides,
    };
  }

  it('rejects a missing or mismatched violation', async () => {
    const tx = {
      parkingViolation: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new ViolationsService(prismaFor(tx));

    await expect(
      service.update(
        'R5-001',
        '00000000-0000-4000-8000-000000000004',
        { occurredAt },
        SYSTEM_ACTOR,
      ),
    ).rejects.toEqual(
      new DomainError(404, 'VIOLATION_NOT_FOUND', 'Violation not found'),
    );
  });

  it('rejects an update for a closed cycle', async () => {
    const tx = {
      parkingViolation: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            baseViolation({ cycle: { id: 'cycle-1', status: 'CLOSED' } }),
          ),
      },
    };
    const service = new ViolationsService(prismaFor(tx));

    await expect(
      service.update(
        'R5-001',
        '00000000-0000-4000-8000-000000000004',
        { occurredAt },
        SYSTEM_ACTOR,
      ),
    ).rejects.toEqual(new DomainError(409, 'CYCLE_CLOSED', 'Cycle is closed'));
  });

  it('rejects an update for a cancelled violation', async () => {
    const tx = {
      parkingViolation: {
        findFirst: jest
          .fn()
          .mockResolvedValue(baseViolation({ status: 'CANCELLED' })),
      },
    };
    const service = new ViolationsService(prismaFor(tx));

    await expect(
      service.update(
        'R5-001',
        '00000000-0000-4000-8000-000000000004',
        { occurredAt },
        SYSTEM_ACTOR,
      ),
    ).rejects.toEqual(
      new DomainError(
        409,
        'VIOLATION_ALREADY_CANCELLED',
        'Violation is already cancelled',
      ),
    );
  });

  it('rejects an update after any fine in the cycle is paid', async () => {
    const tx = {
      parkingViolation: {
        findFirst: jest.fn().mockResolvedValue(baseViolation()),
      },
      fine: { count: jest.fn().mockResolvedValue(1) },
    };
    const service = new ViolationsService(prismaFor(tx));

    await expect(
      service.update(
        'R5-001',
        '00000000-0000-4000-8000-000000000004',
        { occurredAt },
        SYSTEM_ACTOR,
      ),
    ).rejects.toEqual(
      new DomainError(
        409,
        'PAID_CYCLE_IMMUTABLE',
        'Paid cycle cannot be modified',
      ),
    );
  });

  it('updates a violation, resequences its cycle, and audits before and after data', async () => {
    const original = baseViolation();
    const updated = {
      ...original,
      occurredAt: new Date('2026-07-19T03:00:00Z'),
      note: null,
    };
    const update = jest.fn().mockResolvedValue(updated);
    const auditCreate = jest.fn().mockResolvedValue({});
    const tx = {
      parkingViolation: {
        findFirst: jest.fn().mockResolvedValue(original),
        update,
        findMany: jest.fn().mockResolvedValue([updated]),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updated),
      },
      violationCycle: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          ...original.cycle,
          violations: [updated],
        }),
      },
      fine: {
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn(),
      },
      auditLog: { create: auditCreate },
    };
    const service = new ViolationsService(prismaFor(tx));

    const result = await service.update(
      'R5-001',
      original.id,
      { occurredAt: '2026-07-19T10:00:00+07:00', note: null },
      SYSTEM_ACTOR,
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: original.id },
      data: { occurredAt: new Date('2026-07-19T03:00:00Z'), note: null },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: original.id },
      data: { sequenceNumber: 1, status: 'WARNING' },
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        entityType: 'ParkingViolation',
        entityId: original.id,
        action: 'UPDATE',
        before: {
          occurredAt: original.occurredAt.toISOString(),
          note: 'stored note',
        },
        after: {
          occurredAt: updated.occurredAt.toISOString(),
          note: null,
        },
        actorType: 'SYSTEM',
        actorId: null,
        actorLabel: 'core-api',
      },
    });
    expect(result.violation.id).toBe(original.id);
    expect(result.violation.occurredAt).toBe(updated.occurredAt.toISOString());
    expect(result.violation.note).toBeNull();
    expect(result.currentCycle.id).toBe(original.cycleId);
  });

  it('leaves the stored note unchanged when note is omitted', async () => {
    const original = baseViolation();
    const updated = {
      ...original,
      occurredAt: new Date('2026-07-19T03:00:00Z'),
    };
    const update = jest.fn().mockResolvedValue(updated);
    const tx = {
      parkingViolation: {
        findFirst: jest.fn().mockResolvedValue(original),
        update,
        findMany: jest.fn().mockResolvedValue([updated]),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updated),
      },
      violationCycle: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          ...original.cycle,
          violations: [updated],
        }),
      },
      fine: {
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn(),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new ViolationsService(prismaFor(tx));

    const dto = plainToInstance(UpdateViolationDto, {
      occurredAt: '2026-07-19T10:00:00+07:00',
    });

    await service.update('R5-001', original.id, dto, SYSTEM_ACTOR);

    expect(update).toHaveBeenCalledWith({
      where: { id: original.id },
      data: { occurredAt: new Date('2026-07-19T03:00:00Z') },
    });
  });
});
