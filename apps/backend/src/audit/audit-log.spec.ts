import type { Prisma } from '../generated/prisma/client';
import { writeAudit } from './audit-log';

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
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        entityType: 'ParkingViolation',
        entityId: '00000000-0000-4000-8000-000000000001',
        action: 'CREATE',
        before: undefined,
        after: { status: 'WARNING' },
        actorType: 'SYSTEM',
        actorLabel: 'core-api',
      },
    });
  });
});
