import type { Prisma } from '../generated/prisma/client';
import { DomainError } from '../common/domain-error';

export async function findOpenCycleViolation(
  tx: Prisma.TransactionClient,
  houseCode: string,
  violationId: string,
) {
  const violation = await tx.parkingViolation.findFirst({
    where: { id: violationId, cycle: { house: { code: houseCode } } },
    include: { cycle: true, fine: true },
  });
  if (!violation) {
    throw new DomainError(404, 'VIOLATION_NOT_FOUND', 'Violation not found');
  }
  if (violation.cycle.status !== 'OPEN') {
    throw new DomainError(409, 'CYCLE_CLOSED', 'Cycle is closed');
  }
  return violation;
}
