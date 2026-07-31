import { SYSTEM_ACTOR } from '../audit/audit-log';
import { DomainError } from '../common/domain-error';
import type { PrismaService } from '../database/prisma.service';
import { PaymentsService } from './payments.service';

function prismaFor(tx: object): PrismaService {
  return {
    $transaction: jest.fn((operation: (client: object) => unknown) =>
      Promise.resolve(operation(tx)),
    ),
  } as unknown as PrismaService;
}

function violation(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-4000-8000-000000000003',
    cycleId: 'cycle-1',
    sequenceNumber: 3,
    occurredAt: new Date('2026-07-19T02:00:00Z'),
    status: 'PENDING_FINE',
    note: null,
    cancelledAt: null,
    cancellationReason: null,
    cycle: { id: 'cycle-1', status: 'OPEN' },
    fine: {
      id: '10000000-0000-4000-8000-000000000003',
      amountBaht: 1000,
      status: 'PENDING',
      paidAt: null,
      reference: null,
    },
    ...overrides,
  };
}

describe('PaymentsService.markPaid', () => {
  afterEach(() => jest.useRealTimers());

  it('rejects a violation without fine', async () => {
    const tx = {
      parkingViolation: {
        findFirst: jest.fn().mockResolvedValue(violation({ fine: null })),
      },
    };
    const service = new PaymentsService(prismaFor(tx));

    await expect(
      service.markPaid(
        'R5-001',
        '00000000-0000-4000-8000-000000000003',
        {
          paidAt: '2026-07-19T10:00:00+07:00',
        },
        SYSTEM_ACTOR,
      ),
    ).rejects.toEqual(new DomainError(404, 'FINE_NOT_FOUND', 'Fine not found'));
  });

  it('rejects paid fine and closed cycle', async () => {
    const servicePaid = new PaymentsService(
      prismaFor({
        parkingViolation: {
          findFirst: jest.fn().mockResolvedValue(
            violation({
              fine: { ...violation().fine, status: 'PAID' },
            }),
          ),
        },
      }),
    );
    await expect(
      servicePaid.markPaid(
        'R5-001',
        '00000000-0000-4000-8000-000000000003',
        {
          paidAt: '2026-07-19T10:00:00+07:00',
        },
        SYSTEM_ACTOR,
      ),
    ).rejects.toEqual(
      new DomainError(409, 'FINE_ALREADY_PAID', 'Fine is already paid'),
    );

    const serviceClosed = new PaymentsService(
      prismaFor({
        parkingViolation: {
          findFirst: jest
            .fn()
            .mockResolvedValue(
              violation({ cycle: { id: 'cycle-1', status: 'CLOSED' } }),
            ),
        },
      }),
    );
    await expect(
      serviceClosed.markPaid(
        'R5-001',
        '00000000-0000-4000-8000-000000000003',
        {
          paidAt: '2026-07-19T10:00:00+07:00',
        },
        SYSTEM_ACTOR,
      ),
    ).rejects.toEqual(new DomainError(409, 'CYCLE_CLOSED', 'Cycle is closed'));
  });

  it('rejects future payment and payment before violation', async () => {
    jest.useFakeTimers({ now: new Date('2026-07-19T04:00:00Z') });
    const service = new PaymentsService(
      prismaFor({
        parkingViolation: {
          findFirst: jest.fn().mockResolvedValue(violation()),
        },
      }),
    );

    await expect(
      service.markPaid(
        'R5-001',
        '00000000-0000-4000-8000-000000000003',
        {
          paidAt: '2026-07-19T05:00:00Z',
        },
        SYSTEM_ACTOR,
      ),
    ).rejects.toEqual(
      new DomainError(400, 'FUTURE_TIMESTAMP', 'Timestamp cannot be in future'),
    );
    await expect(
      service.markPaid(
        'R5-001',
        '00000000-0000-4000-8000-000000000003',
        {
          paidAt: '2026-07-19T01:00:00Z',
        },
        SYSTEM_ACTOR,
      ),
    ).rejects.toEqual(
      new DomainError(
        400,
        'INVALID_PAYMENT_TIMESTAMP',
        'Payment cannot be before violation',
      ),
    );
  });

  it.each([
    [1, false],
    [0, true],
  ])(
    'keeps open with %i pending fines and closes only on final payment',
    async (pendingCount, expectedClosed) => {
      const paidAt = new Date('2026-07-19T03:00:00Z');
      jest.useFakeTimers({ now: new Date('2026-07-19T04:00:00Z') });
      const source = violation();
      const paidFine = { ...source.fine, status: 'PAID', paidAt };
      const paidViolation = { ...source, status: 'PAID' };
      const cycleUpdate = jest.fn().mockResolvedValue({});
      const auditCreate = jest.fn().mockResolvedValue({});
      const tx = {
        parkingViolation: {
          findFirst: jest.fn().mockResolvedValue(source),
          update: jest.fn().mockResolvedValue(paidViolation),
        },
        fine: {
          update: jest.fn().mockResolvedValue(paidFine),
          count: jest.fn().mockResolvedValue(pendingCount),
          aggregate: jest.fn().mockResolvedValue({ _max: { paidAt } }),
        },
        violationCycle: { update: cycleUpdate },
        auditLog: { create: auditCreate },
      };
      const service = new PaymentsService(prismaFor(tx));

      const result = await service.markPaid(
        'R5-001',
        source.id,
        {
          paidAt: paidAt.toISOString(),
          reference: 'receipt-001',
        },
        SYSTEM_ACTOR,
      );

      expect(result.cycleClosed).toBe(expectedClosed);
      expect(result.fine.status).toBe('PAID');
      expect(cycleUpdate).toHaveBeenCalledTimes(expectedClosed ? 1 : 0);
      if (expectedClosed) {
        expect(cycleUpdate).toHaveBeenCalledWith({
          where: { id: 'cycle-1' },
          data: { status: 'CLOSED', closedAt: paidAt },
        });
      }
      expect(auditCreate).toHaveBeenCalled();
    },
  );
});
