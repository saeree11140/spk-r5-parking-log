import { writeAudit } from '../audit/audit-log';
import type { Prisma } from '../generated/prisma/client';
import {
  buildSequencePlan,
  type SequencePlanItem,
} from '../parking/parking-rules';

export async function resequenceCycle(
  tx: Prisma.TransactionClient,
  cycleId: string,
): Promise<SequencePlanItem[]> {
  const violations = await tx.parkingViolation.findMany({
    where: { cycleId, status: { not: 'CANCELLED' } },
    orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    include: { fine: true },
  });
  const maxSequence = violations.reduce(
    (max, violation) => Math.max(max, violation.sequenceNumber ?? 0),
    0,
  );

  for (const [index, violation] of violations.entries()) {
    await tx.parkingViolation.update({
      where: { id: violation.id },
      data: { sequenceNumber: maxSequence + index + 1 },
    });
  }

  const plan = buildSequencePlan(violations.map(({ id }) => id));
  for (const item of plan) {
    const before = violations.find(({ id }) => id === item.id);
    if (!before) continue;

    const paid = before.fine?.status === 'PAID';
    const status = paid ? 'PAID' : item.status;
    await tx.parkingViolation.update({
      where: { id: item.id },
      data: { sequenceNumber: item.sequenceNumber, status },
    });

    if (item.fineAmountBaht === 0) {
      await tx.fine.updateMany({
        where: { violationId: item.id, status: { not: 'PAID' } },
        data: {
          amountBaht: 0,
          status: 'CANCELLED',
          paidAt: null,
          reference: null,
        },
      });
    } else if (!paid) {
      const fine = await tx.fine.upsert({
        where: { violationId: item.id },
        create: {
          violationId: item.id,
          amountBaht: item.fineAmountBaht,
          status: 'PENDING',
        },
        update: {
          amountBaht: item.fineAmountBaht,
          status: 'PENDING',
          paidAt: null,
          reference: null,
        },
      });
      await writeAudit(
        tx,
        'Fine',
        fine.id,
        before.fine ? 'UPDATE' : 'CREATE',
        before.fine
          ? {
              status: before.fine.status,
              amountBaht: before.fine.amountBaht,
            }
          : null,
        { status: 'PENDING', amountBaht: item.fineAmountBaht },
      );
    }

    if (
      before.sequenceNumber !== item.sequenceNumber ||
      before.status !== status
    ) {
      await writeAudit(
        tx,
        'ParkingViolation',
        item.id,
        'RESEQUENCE',
        {
          sequenceNumber: before.sequenceNumber,
          status: before.status,
        },
        { sequenceNumber: item.sequenceNumber, status },
      );
    }
  }

  return plan;
}
