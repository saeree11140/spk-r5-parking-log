import type { Prisma } from '../generated/prisma/client';
import { SYSTEM_ACTOR, writeAudit } from './audit-log';

describe('writeAudit', () => {
  it('records system actor and snapshots', async () => {
    const create = jest.fn().mockResolvedValue({});
    const tx = { auditLog: { create } } as unknown as Prisma.TransactionClient;

    await writeAudit(
      tx,
      'ParkingViolation',
      '00000000-0000-4000-8000-000000000001',
      'CREATE',
      null,
      { status: 'WARNING' },
      SYSTEM_ACTOR,
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        entityType: 'ParkingViolation',
        entityId: '00000000-0000-4000-8000-000000000001',
        action: 'CREATE',
        before: undefined,
        after: { status: 'WARNING' },
        actorType: 'SYSTEM',
        actorId: null,
        actorLabel: 'core-api',
      },
    });
  });

  it('records the authenticated user actor', async () => {
    const create = jest.fn().mockResolvedValue({});
    const tx = { auditLog: { create } } as unknown as Prisma.TransactionClient;
    const actor = {
      actorType: 'USER' as const,
      actorId: '00000000-0000-4000-8000-000000000001',
      actorLabel: 'เจ้าหน้าที่หนึ่ง',
    };

    await writeAudit(
      tx,
      'ParkingViolation',
      '00000000-0000-4000-8000-000000000002',
      'CREATE',
      null,
      { status: 'WARNING' },
      actor,
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        entityType: 'ParkingViolation',
        entityId: '00000000-0000-4000-8000-000000000002',
        action: 'CREATE',
        before: undefined,
        after: { status: 'WARNING' },
        ...actor,
      },
    });
  });
});
